/* eslint-disable @typescript-eslint/no-non-null-assertion */
import fs from "fs";
import path from "path";
import TurbowarpPackager from "@turbowarp/packager";

import { Packager, Signer } from "../src";
import { LocalExecuter } from "../src/Packager";

const APP_ID = process.env.APP_ID!;
const APP_NAME = process.env.APP_NAME!;
const SCRATCH_FILE = process.env.SCRATCH_FILE!;
const ICON_FILE = process.env.ICON_FILE!;
const KEYSTORE_FILE = process.env.KEYSTORE_FILE!;
const KEYSTORE_PASS = process.env.KEYSTORE_PASS!;
const OUTPUT_PATH = process.env.OUTPUT_PATH ?? "/output/app.apk";
const CALLBACK_URL = process.env.CALLBACK_URL!;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN!;

const run = async () => {
  const headers = {
    authorization: `Bearer ${ACCESS_TOKEN}`,
  };

  try {
    const scratchFile = await fetch(SCRATCH_FILE, { headers });
    const iconFile = await fetch(ICON_FILE, { headers });
    const keystoreFile = await fetch(KEYSTORE_FILE, { headers });

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

    const url = new URL(CALLBACK_URL);
    url.searchParams.set("status", "success");
    await fetch(url, { headers });
  } catch {
    const url = new URL(CALLBACK_URL);
    url.searchParams.set("status", "failed");
    await fetch(url, { headers });
  }
};

void run();
