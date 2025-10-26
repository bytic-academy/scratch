import { NextRequest, NextResponse } from "next/server";

import { env } from "~/env";
import { FileStorage } from "~/server/FileStorage";

const fileStorage = new FileStorage();

export const GET = async (
  req: NextRequest,
  ctx: RouteContext<"/api/projects/[id]/files">,
) => {
  const id = (await ctx.params).id;
  const [, accessToken] = req.headers.get("authorization")?.split(" ") ?? [];

  if (accessToken !== env.WORKFLOW_ACCESS_TOKEN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const icon = await fileStorage.getProjectIcon(id);
  const scratchSource = await fileStorage.getProjectScratchSource(id);
  const keystore = await fileStorage.getProjectKeystore(id);

  return Response.json({
    icon: icon?.url ?? null,
    scratchSource: scratchSource?.url ?? null,
    keystore: keystore?.url ?? null,
  });
};
