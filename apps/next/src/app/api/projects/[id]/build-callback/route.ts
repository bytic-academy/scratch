import { NextRequest, NextResponse } from "next/server";
import { ProjectBuildStatus } from "@prisma/client";

import { env } from "~/env";
import { db } from "~/server/db";

export const GET = async (
  req: NextRequest,
  ctx: RouteContext<"/api/projects/[id]/files">,
) => {
  const id = (await ctx.params).id;
  const status = req.nextUrl.searchParams.get("status");
  const [, accessToken] = req.headers.get("authorization")?.split(" ") ?? [];

  console.log("accessToken", accessToken);
  console.log("env.WORKFLOW_ACCESS_TOKEN", env.WORKFLOW_ACCESS_TOKEN);

  if (accessToken !== env.WORKFLOW_ACCESS_TOKEN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.projectBuild.updateMany({
    where: {
      projectId: id,
      status: ProjectBuildStatus.Building,
    },
    data: {
      status:
        status?.toLowerCase() === "failed"
          ? ProjectBuildStatus.Failed
          : ProjectBuildStatus.Success,
    },
  });

  //   TODO: Download artifcate and save it

  return Response.json({ ok: true });
};
