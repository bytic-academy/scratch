import { TRPCError } from "@trpc/server";
import TurbowarpPackager from "@turbowarp/packager";
import z from "zod";

import {
  DockerExecuter,
  generateP12KeystoreBuffer,
  Packager,
  Signer,
} from "@acme/packager";

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

      return new Uint8Array(buffer);
    }),

  build: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ input, ctx: { db, user, fs } }) => {
      const project = (await db.project.findUnique({
        where: { id: input.projectId, creatorId: user.id },
      }))!;

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

      await executer.remove();

      console.log("saveProjectApk");
      await fs.saveProjectApk(project.id, apk);
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
