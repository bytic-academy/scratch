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
} from "~/server/schemas/project";
import { generateRandomString } from "~/utils/str";
import { convertToPng } from "../utils/image";

export const projectRouter = createTRPCRouter({
  create: protectedProcedure
    .input(CreateProjectSchema)
    .mutation(async ({ input, ctx: { db, user } }) => {
      const keypass = generateRandomString(32);
      const keystore = generateP12KeystoreBuffer({
        keypass,
      });

      const project = await db.project.create({
        data: {
          name: input.name,
          keypass,
          keystore: keystore,
          creator: {
            connect: {
              id: user.id,
            },
          },
        },
      });

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

  loadIcon: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input, ctx: { db, user, fs } }) => {
      const project = await db.project.findUnique({
        where: { id: input.projectId, creatorId: user.id },
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      const buffer = await fs.getProjectIcon(project.id);

      if (!buffer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project has not any icons",
        });
      }

      console.log(buffer);

      return new Uint8Array(buffer);
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
    .query(async ({ input, ctx: { db, user } }) => {
      const PAGE_SIZE = 20;

      const projects = await db.project.findMany({
        where: {
          creatorId: user.id,
        },
        skip: (input.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      });

      return projects.map((project) => ({
        id: project.id,
        name: project.name,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      }));
    }),
});
