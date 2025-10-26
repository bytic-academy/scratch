import { TRPCError } from "@trpc/server";
import z from "zod";

import { generateP12KeystoreBuffer } from "@acme/packager";

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

      if (project.isBuilding || project.queuedAt) {
        return;
      }

      const scratchFile = await fs.getProjectScratchSource(project.id);
      const keystore = await fs.getProjectKeystore(project.id);

      if (!scratchFile || !keystore) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "scratch file or keystore not exists",
        });
      }

      await db.project.update({
        where: { id: project.id },
        data: { queuedAt: new Date() },
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
      });

      return Promise.all(
        projects.map(async (project) => ({
          id: project.id,
          name: project.name,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          iconUrl: (await fs.getProjectIcon(project.id))?.url,
        })),
      );
    }),
});
