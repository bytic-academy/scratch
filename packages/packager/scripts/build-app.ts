import fs from "fs";
import path from "path";

import { Packager, Signer } from "../src";
import { LocalExecuter } from "../src/Packager";

/**
 * Resolves an input that might be a URL, a local file path, or plain text.
 * - If it's a URL → fetches and returns the file as Buffer
 * - If it's a local path → reads and returns as Buffer
 * - Otherwise → returns the original string
 */
async function resolveInput(input: string): Promise<Buffer | string> {
  // Trim to avoid whitespace issues
  const trimmed = input.trim();

  // 1. Check if it's a URL (http or https)
  try {
    const url = new URL(trimmed);
    if (url.protocol === "http:" || url.protocol === "https:") {
      const res = await fetch(url);
      if (!res.ok)
        throw new Error(`Failed to fetch ${url.toString()}: ${res.statusText}`);
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
  } catch {
    // Not a valid URL — continue
  }

  // 2. Check if it's a local file path (disk URI or regular path)
  try {
    // Handles both file:///C:/path and normal paths
    const path = trimmed.startsWith("file://") ? new URL(trimmed) : trimmed;
    const data = await fs.promises.readFile(path);
    return data;
  } catch {
    // Not a valid file path
  }

  // 3. Fallback: return as plain string
  return trimmed;
}

const APP_ID = process.env.APP_ID!;
const APP_NAME = process.env.APP_NAME!;
const HTML_FILE = process.env.HTML_FILE!;
const ICON_FILE = process.env.ICON_FILE!;
const KEYSTORE_FILE = process.env.KEYSTORE_FILE;
const KEYSTORE_PASS = process.env.KEYSTORE_PASS!;
const OUTPUT_PATH = process.env.OUTPUT_PATH ?? "/output/app.apk";
const CALLBACK_URL = process.env.CALLBACK_URL!;

const run = async () => {
  const executer = new LocalExecuter();

  const packager = new Packager({ offline: true }, executer);

  await packager.init({
    appId: APP_ID,
    appName: APP_NAME,
    scratchHtml: await resolveInput(HTML_FILE),
    icon: await resolveInput(ICON_FILE),
  });

  let signer: Signer;

  if (KEYSTORE_FILE) {
    await executer.writeFile(
      Signer.KEYSTORE_PATH,
      await resolveInput(KEYSTORE_FILE),
    );

    signer = new Signer({ storePass: KEYSTORE_PASS }, executer);
  } else {
    signer = await Signer.generateKeystore(
      { storePass: KEYSTORE_PASS },
      executer,
    );
  }

  await packager.build();

  const app = await packager.sign(signer);

  await fs.promises.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.promises.writeFile(OUTPUT_PATH, app);
};

void run();
