import fs from "fs";
import { NextRequest, NextResponse } from "next/server";

import { env } from "~/env";
import { FileStorage } from "~/server/FileStorage";

const fileStorage = new FileStorage();

export const GET = async (
  req: NextRequest,
  ctx: RouteContext<"/api/projects/[id]/files/scratch">,
) => {
  const id = (await ctx.params).id;
  const [, accessToken] = req.headers.get("authorization")?.split(" ") ?? [];

  if (accessToken !== env.WORKFLOW_ACCESS_TOKEN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const file = await fileStorage.getProjectScratchSource(id);

  if (!file) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const stream = fs.createReadStream(file);
  const fileStat = await fs.promises.stat(file);

  return new Response(stream as any, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": fileStat.size.toString(),
      "Content-Disposition": `attachment; filename="scratch.sb3"`,
    },
  });
};
