/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { spawn } from "child_process";

function runOpenSSL(
  args: string[],
  input?: Buffer | string,
  encoding: BufferEncoding | "buffer" = "utf8",
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn("openssl", args);

    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    if (input) {
      child.stdin.write(input);
    }
    child.stdin.end();

    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));

    child.on("error", reject);

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(Buffer.concat(stderr).toString("utf8")));
      } else {
        const out = Buffer.concat(stdout);
        resolve(
          encoding === "buffer" ? out : Buffer.from(out.toString(encoding)),
        );
      }
    });
  });
}

interface KeystoreOptions {
  keyalias: string;
  keypass: string;
  cn?: string;
}

export async function createP12KeystoreBuffer({
  keyalias,
  keypass,
  cn = "CN=MyApp,O=MyCompany,C=US",
}: KeystoreOptions): Promise<Buffer> {
  // 1. Generate private key
  const privateKey = await runOpenSSL(
    ["genrsa", "-aes256", "-passout", `pass:${keypass}`, "2048"],
    undefined,
    "utf8",
  );

  // 2. Generate self-signed certificate
  const cert = await runOpenSSL(
    [
      "req",
      "-new",
      "-x509",
      "-subj",
      `/${cn}`,
      "-days",
      "3650",
      "-key",
      "/dev/stdin",
      "-passin",
      `pass:${keypass}`,
    ],
    privateKey,
    "utf8",
  );

  // 3. Create PKCS#12 keystore (binary output)
  const p12 = await runOpenSSL(
    [
      "pkcs12",
      "-export",
      "-name",
      keyalias,
      "-passin",
      `pass:${keypass}`,
      "-passout",
      `pass:${keypass}`,
      "-inkey",
      "/dev/stdin",
      "-in",
      "/dev/stdin",
    ],
    Buffer.concat([privateKey, cert]),
    "buffer",
  );

  return p12; // this is the keystore content
}
