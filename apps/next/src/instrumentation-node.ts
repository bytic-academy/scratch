// lib/cron.ts
import { setInterval } from "node:timers/promises";
import { Octokit } from "@octokit/rest";

import type { Project } from "./prisma/generated/client";
import { env } from "./env";
import { ProjectBuildStatus } from "./prisma/generated/client";
import { db } from "./server/db";

type WorkflowInputs = {
  USER_ID: string;
  APP_ID: string;
  APP_NAME: string;
  SCRATCH_FILE: string;
  ICON_FILE: string;
  KEYSTORE_FILE: string;
  KEYSTORE_PASS: string;
  OUTPUT_PATH?: string;
  CALLBACK_URL: string;
};

async function triggerWorkflow(
  owner: string,
  repo: string,
  workflowFileName: string, // e.g., "packager.yml"
  ref: string, // branch, tag, or commit
  inputs: WorkflowInputs,
  token: string,
) {
  const octokit = new Octokit({ auth: token });

  await octokit.actions.createWorkflowDispatch({
    owner,
    repo,
    workflow_id: workflowFileName,
    ref,
    inputs,
  });

  console.log("Workflow triggered successfully!");
}

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
      data: { queuedAt: null },
    });
    return project;
  });

  console.log("project", project);

  if (!project) {
    return;
  }

  try {
    await triggerWorkflow(
      "bytic-academy",
      "scratch",
      "packager.yml",
      "main",
      {
        USER_ID: project.creatorId,
        APP_ID: `com.bytic.${project.creatorId}.${project.id}`,
        APP_NAME: project.name,
        SCRATCH_FILE: `/api/projects/${project.id}/files/scratch`,
        ICON_FILE: `/api/projects/${project.id}/files/icon`,
        KEYSTORE_FILE: `/api/projects/${project.id}/files/keystore`,
        KEYSTORE_PASS: project.keypass,
        CALLBACK_URL: `${env.NEXT_PUBLIC_WEB_URL}/api/build-callback/${project.id}`,
      },
      env.GITHUB_TOKEN,
    );

    await db.projectBuild.create({
      data: {
        status: ProjectBuildStatus.Building,
        project: {
          connect: {
            id: project.id,
          },
        },
      },
    });
  } catch (e) {
    console.log(
      `Failed triggering project build for "${project.id}". reason:`,
      e,
    );
  }
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

// // Job 2
// (async () => {
//   for await (const _ of setInterval(1000)) {
//     await runTask();
//   }
// })();
// // }
