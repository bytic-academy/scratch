import { zfd } from "zod-form-data";
import { z } from "zod/v4";

export const CreateProjectSchema = z.object({
  name: z.string().min(3).max(255),
});

export const UpdateProjectSchema = z.object({
  id: z.string(),
  data: CreateProjectSchema,
});

export const DeleteProjectSchema = z.object({
  id: z.string(),
});

export const QueryProjectSchema = z.object({
  page: z.number(),
});

export const SupportedIconFormats = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/tiff",
  "image/avif",
  "image/svg+xml",
  "image/heif",
  "image/heic",
  "image/bmp",
  "image/vnd.microsoft.icon",
];

export const UpdateProjectIconSchema = zfd.formData({
  projectId: z.string(),
  file: zfd.file(z.instanceof(File)).check(
    z.property(
      "size",
      z
        .number()
        .min(1)
        .max(1024 * 1024),
    ),
    z.property("type", z.enum(SupportedIconFormats)),
  ),
});

export const SupportedScratchSourceFormats = ["application/octet-stream"];

export const UpdateProjectScratchSourceSchema = zfd.formData({
  projectId: z.string(),
  file: zfd.file(z.instanceof(File)).check(
    z.property("name", z.string().endsWith(".sb3")),
    z.property(
      "size",
      z
        .number()
        .min(1)
        .max(1024 * 1024 * 50),
    ),
    z.property("type", z.enum(SupportedScratchSourceFormats)),
  ),
});
