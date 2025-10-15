"use client";

import React, { useEffect, useState } from "react";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import ReactCrop, {
  convertToPercentCrop,
  convertToPixelCrop,
} from "react-image-crop";
import { z } from "zod/v4";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Dropzone } from "~/components/ui/dropzone";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  CreateProjectSchema,
  SupportedIconFormats,
  SupportedScratchSourceFormats,
  UpdateProjectIconSchema,
  UpdateProjectScratchSourceSchema,
} from "~/server/schemas/project";
import { trpc } from "~/utils/trpc";

import "react-image-crop/dist/ReactCrop.css";

import { FileCodeIcon, ImageIcon } from "lucide-react";

import { ScrollArea } from "~/components/ui/scroll-area";
import { cn } from "~/lib/utils";

/**
 * Crop an image using react-image-crop output and return a File object
 */
export async function getCroppedImgFile(
  imageUrl: string,
  crop: { x: number; y: number; width: number; height: number },
  fileName = "cropped.png",
): Promise<File> {
  // Load image in memory
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // for CORS
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = imageUrl;
  });

  // Convert % → px based on natural image size
  const cropPx = {
    x: (crop.x / 100) * image.naturalWidth,
    y: (crop.y / 100) * image.naturalHeight,
    width: (crop.width / 100) * image.naturalWidth,
    height: (crop.height / 100) * image.naturalHeight,
  };

  const canvas = document.createElement("canvas");
  canvas.width = cropPx.width;
  canvas.height = cropPx.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(
    image,
    cropPx.x,
    cropPx.y,
    cropPx.width,
    cropPx.height,
    0,
    0,
    cropPx.width,
    cropPx.height,
  );

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("Canvas is empty"));
      resolve(new File([blob], fileName, { type: "image/png" }));
    }, "image/png");
  });
}

const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<
    z.infer<typeof CreateProjectSchema> & {
      icon: {
        file: z.infer<typeof UpdateProjectIconSchema>["file"];
        fileUrl: string;
        width: number;
        height: number;
        x: number;
        y: number;
      };
      scratchSource: z.infer<typeof UpdateProjectScratchSourceSchema>["file"];
    }
  >({
    resolver: standardSchemaResolver(
      CreateProjectSchema.extend({
        icon: z.object({
          file: UpdateProjectIconSchema.out.shape.file.out,
          width: z.number(),
          height: z.number(),
          x: z.number(),
          y: z.number(),
          fileUrl: z.string(),
        }),
        scratchSource: UpdateProjectScratchSourceSchema.out.shape.file.out,
      }),
    ),
    defaultValues: {
      name: "",
      // icon: undefined,
    },
  });

  const { refetchQueries } = useQueryClient();

  const { mutateAsync: updateProjectIcon } = useMutation(
    trpc.project.updateIcon.mutationOptions(),
  );

  const { mutateAsync: updateProjectScratchSource } = useMutation(
    trpc.project.updateScratchSource.mutationOptions(),
  );

  const { mutateAsync: createProject } = useMutation(
    trpc.project.create.mutationOptions(),
  );

  useEffect(() => {
    if (!isOpen) {
      URL.revokeObjectURL(form.getValues("icon.fileUrl"));
      form.reset({
        name: "",
      });
    }
  }, [isOpen]);

  return (
    <div className="flex items-center gap-2">
      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
          <Dialog open={isOpen} onOpenChange={(isOpen) => setIsOpen(isOpen)}>
            <DialogTrigger asChild>
              <Button>پروژه جدید</Button>
            </DialogTrigger>

            <DialogContent className="px-0 sm:max-w-md">
              <ScrollArea className="max-h-[calc(100svh-128px)] px-6" dir="rtl">
                <div className="flex flex-col gap-6">
                  <DialogHeader>
                    <DialogTitle>پروژه جدیدت رو اضافه کن</DialogTitle>
                    <DialogDescription>
                      اینجا میتونی پروژه اسکرچی که ساختی رو اضافه کنی
                    </DialogDescription>
                  </DialogHeader>

                  <div className="col-span-2 grid items-center gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="col-span-2 gap-2">
                          <FormLabel>اسم پروژه</FormLabel>

                          <FormControl>
                            <Input {...field} />
                          </FormControl>

                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="icon"
                      render={({ field }) => (
                        <FormItem className="col-span-2 gap-2">
                          <FormLabel>آیکون</FormLabel>

                          {!field.value && (
                            <FormControl>
                              <Dropzone
                                {...field}
                                supportedFormats={SupportedIconFormats.join(
                                  ",",
                                )}
                                onChange={(file) =>
                                  field.onChange({
                                    file,
                                    fileUrl: URL.createObjectURL(file),
                                    width: 0,
                                    height: 0,
                                    x: 0,
                                    y: 0,
                                  })
                                }
                              >
                                <ImageIcon className="size-8 stroke-1" />
                                برای بارگزاری آیکون اینجا کلیک کن
                              </Dropzone>
                            </FormControl>
                          )}

                          {field.value && (
                            <ReactCrop
                              aspect={1}
                              minWidth={48}
                              minHeight={48}
                              maxHeight={512}
                              maxWidth={512}
                              onChange={(_, data) =>
                                field.onChange({ ...field.value, ...data })
                              }
                              crop={{ ...field.value, unit: "%" }}
                              className="w-full"
                            >
                              <img
                                src={field.value.fileUrl}
                                alt=""
                                className="w-full"
                                onLoad={(e) => {
                                  const { naturalWidth, naturalHeight } =
                                    e.currentTarget;

                                  field.onChange({
                                    ...field.value,
                                    ...convertToPercentCrop(
                                      { width: 512, height: 512 },
                                      naturalWidth,
                                      naturalHeight,
                                    ),
                                  });
                                }}
                              />
                            </ReactCrop>
                          )}

                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="scratchSource"
                      render={({ field }) => (
                        <FormItem className="col-span-2 gap-2">
                          <FormLabel>فایل اسکرچ</FormLabel>

                          <FormControl>
                            <Dropzone
                              {...field}
                              supportedFormats="*"
                              onChange={(file) =>(console.log(file), field.onChange(file))}
                              className={cn(field.value && "text-green-700")}
                            >
                              <FileCodeIcon className="size-8 stroke-1" />
                              {field.value
                                ? "آپلود شد! برای تغییرش میتونی دوباره کلیک کنی"
                                : "برای بارگزاری فایل اسکرچ اینجا کلیک کن"}
                            </Dropzone>
                          </FormControl>

                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <DialogFooter className="sm:justify-start">
                    <DialogClose asChild>
                      <Button type="button" variant="secondary">
                        لغو
                      </Button>
                    </DialogClose>

                    <Button
                      type="submit"
                      onClick={form.handleSubmit(
                        async ({ icon, scratchSource, ...values }) => {
                          let isProjectCreated = false;

                          try {
                            const createdProject = await createProject(values);

                            isProjectCreated = true;

                            const iconFormData = new FormData();

                            const croppedImage = await getCroppedImgFile(
                              icon.fileUrl,
                              icon,
                            );

                            iconFormData.set("projectId", createdProject.id);
                            iconFormData.set("file", croppedImage);

                            const scratchSourceFormData = new FormData();

                            scratchSourceFormData.set(
                              "projectId",
                              createdProject.id,
                            );
                            scratchSourceFormData.set("file", scratchSource);

                            await Promise.allSettled([
                              (updateProjectIcon(iconFormData),
                              updateProjectScratchSource(
                                scratchSourceFormData,
                              )),
                            ]);
                          } finally {
                            if (isProjectCreated) {
                              setIsOpen(false);
                              refetchQueries(trpc.project.getAll.queryFilter());
                            }
                          }
                        },
                      )}
                    >
                      ثبت
                    </Button>
                  </DialogFooter>
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </form>
      </Form>
    </div>
  );
};

export default Header;
