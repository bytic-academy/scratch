import { Octokit } from "@octokit/rest";
import { ProjectBuildStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import z from "zod";

import { generateP12KeystoreBuffer } from "@acme/packager";

import { env } from "~/env";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  CreateProjectSchema,
  DeleteProjectSchema,
  QueryProjectSchema,
  UpdateProjectIconSchema,
  UpdateProjectSchema,
  UpdateProjectScratchSourceSchema,
} from "~/server/schemas/project";
import { generateRandomString } from "~/utils/str";
import { convertToPng } from "../utils/image";

const octokit = new Octokit({ auth: env.GITHUB_TOKEN });

// type WorkflowInputs = {
//   USER_ID: string;
//   APP_ID: string;
//   APP_NAME: string;
//   SCRATCH_FILE: string;
//   ICON_FILE: string;
//   KEYSTORE_FILE: string;
//   KEYSTORE_PASS: string;
//   OUTPUT_PATH?: string;
//   CALLBACK_URL: string;
// };

// async function triggerWorkflow(
//   owner: string,
//   repo: string,
//   workflowFileName: string, // e.g., "packager.yml"
//   ref: string, // branch, tag, or commit
//   inputs: WorkflowInputs,
//   token: string,
// ) {
//   const octokit = new Octokit({ auth: token });

//   await octokit.actions.createWorkflowDispatch({
//     owner,
//     repo,
//     workflow_id: workflowFileName,
//     ref,
//     inputs,
//   });

//   console.log("Workflow triggered successfully!");
// }
export const projectRouter = createTRPCRouter({
  create: protectedProcedure
    .input(CreateProjectSchema)
    .mutation(async ({ input, ctx: { db, user, fs } }) => {
      const keypass = generateRandomString(32);
      const keystore = generateP12KeystoreBuffer({
        keypass,
      });

      const project = await db.project.create({
        data: {
          name: input.name,
          keypass,
          creator: {
            connect: {
              id: user.id,
            },
          },
        },
      });

      await fs.saveProjectKeystore(project.id, keystore);

      return {
        id: project.id,
        name: project.name,
      };
    }),

  update: protectedProcedure
    .input(UpdateProjectSchema)
    .mutation(async ({ input, ctx: { db, user } }) => {
      const project = await db.project.findUnique({
        where: { id: input.id, creatorId: user.id },
      });

      if (!project) {
        return new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      await db.project.update({
        where: { id: input.id, creatorId: user.id },
        data: input.data,
      });
    }),

  updateScratchSource: protectedProcedure
    .input(UpdateProjectScratchSourceSchema)
    .mutation(async ({ input, ctx: { db, user, fs } }) => {
      const project = await db.project.findUnique({
        where: { id: input.projectId, creatorId: user.id },
      });

      if (!project) {
        return new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      await fs.saveProjectScratchSource(
        project.id,
        Buffer.from(await input.file.arrayBuffer()),
      );
    }),

  updateIcon: protectedProcedure
    .input(UpdateProjectIconSchema)
    .mutation(async ({ input, ctx: { db, user, fs } }) => {
      const project = await db.project.findUnique({
        where: { id: input.projectId, creatorId: user.id },
      });

      if (!project) {
        return new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      const file = await convertToPng(await input.file.arrayBuffer());

      await fs.saveProjectIcon(project.id, file);
    }),

  // loadIcon: protectedProcedure
  //   .input(z.object({ projectId: z.string() }))
  //   .query(async ({ input, ctx: { db, user, fs } }) => {
  //     const project = await db.project.findUnique({
  //       where: { id: input.projectId, creatorId: user.id },
  //     });

  //     if (!project) {
  //       throw new TRPCError({
  //         code: "NOT_FOUND",
  //         message: "Project not found",
  //       });
  //     }

  //     const buffer = await fs.getProjectIcon(project.id);

  //     if (!buffer) {
  //       throw new TRPCError({
  //         code: "NOT_FOUND",
  //         message: "Project has not any icons",
  //       });
  //     }

  //     return new Uint8Array(buffer);
  //   }),

  build: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ input, ctx: { db, user, fs } }) => {
      const project = await db.project.findUnique({
        where: { id: input.projectId, creatorId: user.id },
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "project not found",
        });
      }

      const remainingProjectBuild = await db.projectBuild.findFirst({
        where: {
          status: ProjectBuildStatus.Building,
          project: {
            creatorId: project.creatorId,
          },
        },
      });

      if (remainingProjectBuild) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "A build is currently in progress",
        });
      }

      const scratchFile = await fs.getProjectScratchSource(project.id);
      const keystore = await fs.getProjectKeystore(project.id);

      if (!scratchFile || !keystore) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "scratch file or keystore not exists",
        });
      }

      await octokit.actions.createWorkflowDispatch({
        owner: "bytic-academy",
        repo: "scratch",
        workflow_id: "packager.yml",
        ref: "main",
        inputs: {
          USER_ID: project.creatorId,
          APP_ID: `com.bytic.${project.creatorId}.${project.id}`,
          APP_NAME: project.name,
          FILES_URL: `${env.NEXT_PUBLIC_WEB_URL}/api/projects/${project.id}/files`,
          KEYSTORE_PASS: project.keypass,
          CALLBACK_URL: `${env.NEXT_PUBLIC_WEB_URL}/api/projects/${project.id}/build-callback`,
          OUTPUT_PATH: `/projects/${project.id}/app.apk`,
        },
      });

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
    }),

  delete: protectedProcedure
    .input(DeleteProjectSchema)
    .mutation(async ({ input, ctx: { db, user, fs } }) => {
      const project = await db.project.findUnique({
        where: { id: input.id, creatorId: user.id },
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      await fs.removeProjectData(project.id);

      await db.project.delete({ where: { id: project.id } });
    }),

  getAll: protectedProcedure
    .input(QueryProjectSchema)
    .query(async ({ input, ctx: { db, user, fs } }) => {
      const PAGE_SIZE = 20;

      const projects = await db.project.findMany({
        where: {
          creatorId: user.id,
        },
        skip: (input.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          builds: {
            where: {
              status: ProjectBuildStatus.Building,
            },
          },
        },
      });

      return Promise.all(
        projects.map(async (project) => ({
          id: project.id,
          name: project.name,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          isBuilding: project.builds.length > 0,
          iconUrl: (await fs.getProjectIcon(project.id))?.url,
          apkUrl: (await fs.getProjectApk(project.id))?.downloadUrl,
        })),
      );
    }),
});
