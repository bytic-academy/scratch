import TurbowarpPackager from "@turbowarp/packager";

import { DockerExecuter, Packager, Signer } from "@acme/packager";

import type { Project } from "./prisma/generated/client";
import { sleep } from "~/utils/sleep";
import { db } from "./server/db";
import { FileStorage } from "./server/FileStorage";

const fs = new FileStorage();

const build = async (project: Project) => {
  const scratchFile = await fs.getProjectScratchSource(project.id);
  const keystore = await fs.getProjectKeystore(project.id);

  console.log("validating");
  // validate inputs before build
  if (!scratchFile || !keystore) return;

  const loadedProject = await TurbowarpPackager.loadProject(scratchFile);
  console.log("test");

  const warpPackager = new TurbowarpPackager.Packager();

  warpPackager.project = loadedProject;
  warpPackager.options.autoplay = true;

  console.log("and here");
  const packageResult = await warpPackager.package();

  const scratchHtml = Buffer.from(packageResult.data).toString("utf8");

  const executer = new DockerExecuter();

  try {
    await executer.start();

    const packager = new Packager(
      {
        proxy: {
          host: "192.168.100.96",
          port: 8080,
        },
      },
      executer,
    );

    console.log("initing");

    await packager.init({
      appId: `com.bytic.${project.creatorId}.${project.id}`,
      appName: project.name,
      scratchHtml,
    });

    console.log("build");
    await packager.build();

    console.log("writeFile");
    await executer.writeFile(Signer.KEYSTORE_PATH, keystore);

    const signer = new Signer({ storePass: project.keypass }, executer);

    console.log("packager.sign");
    const apk = await packager.sign(signer);

    console.log("saveProjectApk");
    await fs.saveProjectApk(project.id, apk);
  } finally {
    await executer.remove();
  }
};

async function processBuildProject() {
  while (true) {
    const project = await db.$transaction(async (tx) => {
      const [project] = await tx.$queryRaw<Project[]>`
        SELECT * FROM "Project"
        WHERE "queuedAt" IS NOT NULL
        ORDER BY "queuedAt" ASC
        LIMIT 1
        FOR UPDATE
      `;

      if (!project) return null;

      await tx.project.update({
        where: { id: project.id },
        data: { queuedAt: null },
      });

      return project;
    });

    if (!project) {
      await sleep(1000);
      continue;
    }

    try {
      await build(project);
    } catch (e) {}

    await sleep(1000);
  }
}

void processBuildProject();
void processBuildProject();
