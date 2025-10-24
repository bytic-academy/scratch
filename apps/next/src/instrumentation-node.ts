// lib/cron.ts
import { setInterval } from "node:timers/promises";
import * as TurbowarpPackager from "@turbowarp/packager";

import { DockerExecuter, Packager, Signer } from "@acme/packager";

import type { Project } from "./prisma/generated/client";
import { sleep } from "~/utils/sleep";
import { db } from "./server/db";
import { FileStorage } from "./server/FileStorage";

const fs = new FileStorage();

const build = async (project: Project) => {
  const scratchFile = await fs.getProjectScratchSource(project.id);
  const keystore = await fs.getProjectKeystore(project.id);
  const icon = await fs.getProjectIcon(project.id);

  console.log("validating");
  // validate inputs before build
  if (!scratchFile || !keystore || !icon) return;

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

    const packager = new Packager({ offline: true }, executer);

    console.log("initing");

    await packager.init({
      appId: `com.bytic.${project.creatorId}.${project.id}`,
      appName: project.name,
      scratchHtml,
      // icon,
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

async function runTask() {
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
      data: { queuedAt: null, isBuilding: true },
    });

    return project;
  });

  console.log("project", project);

  if (!project) {
    return;
  }

  try {
    await build(project);

    await db.projectBuild.create({
      data: {
        project: {
          connect: {
            id: project.id,
          },
        },
      },
    });
  } catch (e) {
    console.log(`Failed building project "${project.id}". reason:`, e);
  }

  await db.project.update({
    where: { id: project.id },
    data: { isBuilding: false },
  });
}

// Your async task
// async function doTask(id: number) {
//   console.log(`[${new Date().toISOString()}] Job ${id} started`);

//   // Simulate an async operation
//   await new Promise((r) => setTimeout(r, 500));

//   console.log(`[${new Date().toISOString()}] Job ${id} finished`);
// }

// Start cron jobs (call this once from app startup)
// export function startCrons() {
// Job 1
(async () => {
  for await (const _ of setInterval(1000)) {
    await runTask();
  }
})();

// Job 2
(async () => {
  for await (const _ of setInterval(1000)) {
    await runTask();
  }
})();
// }
