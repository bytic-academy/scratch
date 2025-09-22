import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createP12KeystoreBuffer } from "@acme/packager";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { generateRandomString } from "~/utils/str";

const CreateProjectSchema = z.object({
  name: z.string().min(3).max(255),
});

export const projectRouter = createTRPCRouter({
  create: protectedProcedure
    .input(CreateProjectSchema)
    .query(async ({ input, ctx: { db, user } }) => {
      const keyalias = generateRandomString(12);
      const keypass = generateRandomString(32);
      const keystore = await createP12KeystoreBuffer({ keyalias, keypass });

      const project = await db.project.create({
        data: {
          name: input.name,
          keyalias,
          keypass,
          keystore: keystore.toString(),
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
    .input(
      z.object({
        id: z.string(),
        data: CreateProjectSchema,
      }),
    )
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

  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input, ctx: { db, user } }) => {
      await db.project.delete({
        where: {
          id: input.id,
          creatorId: user.id,
        },
      });
    }),

  getAll: protectedProcedure
    .input(z.object({ page: z.number() }))
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
