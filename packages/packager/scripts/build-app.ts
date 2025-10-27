/* eslint-disable @typescript-eslint/no-non-null-assertion */
import fs from "fs";
import path from "path";
import TurbowarpPackager from "@turbowarp/packager";

import { Packager, Signer } from "../src";
import { LocalExecuter } from "../src/Packager";

import * as BlobStorage from "@vercel/blob"

const APP_ID = process.env.APP_ID!;
const APP_NAME = process.env.APP_NAME!;
const FILES_URL = process.env.FILES_URL!;
const KEYSTORE_PASS = process.env.KEYSTORE_PASS!;
const OUTPUT_PATH = process.env.OUTPUT_PATH ?? "/output/app.apk";
const CALLBACK_URL = process.env.CALLBACK_URL!;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN!;
const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN!;

const run = async () => {
  const headers = {
    authorization: `Bearer ${ACCESS_TOKEN}`,
  };

  try {
    const filesResponse = await fetch(FILES_URL, { headers });

    if (!filesResponse.ok)
      throw new Error(
        `Failed to fetch ${FILES_URL}: ${filesResponse.status} - ${filesResponse.statusText}`,
      );

    const files = (await filesResponse.json()) as {
      scratchSource: string | null;
      icon: string | null;
      keystore: string | null;
    };

    if (!files.icon || !files.keystore || !files.scratchSource) {
      throw new Error("Some files do not exists");
    }

    const scratchFile = await fetch(files.scratchSource);
    const iconFile = await fetch(files.icon);
    const keystoreFile = await fetch(files.keystore);

    const loadedProject = await TurbowarpPackager.loadProject(
      Buffer.from(await scratchFile.arrayBuffer()),
    );

    const warpPackager = new TurbowarpPackager.Packager();

    warpPackager.project = loadedProject;
    warpPackager.options.autoplay = true;

    const packageResult = await warpPackager.package();

    const scratchHtml = Buffer.from(packageResult.data).toString("utf8");

    const executer = new LocalExecuter();

    const packager = new Packager({ offline: true }, executer);

    await packager.init({
      appId: APP_ID,
      appName: APP_NAME,
      scratchHtml,
      icon: Buffer.from(await iconFile.arrayBuffer()),
    });

    await executer.writeFile(
      Signer.KEYSTORE_PATH,
      Buffer.from(await keystoreFile.arrayBuffer()),
    );

    const signer = new Signer({ storePass: KEYSTORE_PASS }, executer);

    await packager.build();

    const app = await packager.sign(signer);

    await fs.promises.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await fs.promises.writeFile(OUTPUT_PATH, app);

    await BlobStorage.put(OUTPUT_PATH, app, {
      access: "public",
      allowOverwrite: true,
      cacheControlMaxAge: 1,
      token: BLOB_READ_WRITE_TOKEN,
    });

    const url = new URL(CALLBACK_URL);
    url.searchParams.set("status", "success");
    await fetch(url, { headers });
  } catch (e) {
    const url = new URL(CALLBACK_URL);

    url.searchParams.set("status", "failed");

    await fetch(url, { headers });

    throw e;
  }
};

void run();
