"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DownloadIcon, HammerIcon, TrashIcon } from "lucide-react";

import type { RouterOutput } from "~/server/api/root";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { trpc, trpcClient } from "~/utils/trpc";

type ProjectCardProps = {
  data: RouterOutput["project"]["getAll"][number];
  canBuild: boolean;
};

const ProjectCard: React.FC<ProjectCardProps> = ({ data, canBuild }) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { refetchQueries } = useQueryClient();

  const { mutate: deleteProject } = useMutation(
    trpc.project.delete.mutationOptions({
      onSuccess() {
        setIsDeleteDialogOpen(false);
        refetchQueries(trpc.project.getAll.queryFilter());
      },
    }),
  );

  const { mutate: buildProject, isPending } = useMutation(
    trpc.project.build.mutationOptions({
      onSuccess() {
        refetchQueries(trpc.project.getAll.queryFilter());
      },
    }),
  );

  return (
    <Card className="col-span-12 py-4 min-[500px]:col-span-6 sm:col-span-4 lg:col-span-3">
      <CardHeader className="flex h-20 items-center justify-between px-4">
        <CardTitle>{data.name}</CardTitle>

        {data.iconUrl && (
          <img
            src={data.iconUrl}
            className="aspect-square h-full rounded-full"
          />
        )}
      </CardHeader>

      <CardContent className="px-4"></CardContent>

      <CardFooter className="gap-2 px-4">
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive">
              <TrashIcon />
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>واقعا میخوای این پروژه رو حذف کنی؟</DialogTitle>
            </DialogHeader>

            <DialogFooter>
              <Button
                variant="destructive"
                onClick={() => deleteProject({ id: data.id })}
              >
                بله
              </Button>

              <DialogClose asChild>
                <Button variant="secondary">خیر</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button
          onClick={() => {
            buildProject({ projectId: data.id });
          }}
          disabled={isPending || data.isBuilding || !canBuild}
        >
          <HammerIcon />
        </Button>

        <Button asChild>
          <Link
            href={data.apkUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            download
            data-disabled={!data.apkUrl}
            className="[data-disabled=true]:pointer-events-none! [data-disabled=true]:cursor-not-allowed! [data-disabled=true]:opacity-50!"
          >
            <DownloadIcon />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

const List: React.FC = () => {
  const { data } = useQuery(
    trpc.project.getAll.queryOptions({
      page: 1,
    }),
  );

  const canBuild = !data?.some((item) => item.isBuilding);

  return (
    <div className="grid grid-cols-12 gap-6">
      {data?.map((project) => (
        <ProjectCard key={project.id} data={project} canBuild={canBuild} />
      ))}
    </div>
  );
};

export default List;
