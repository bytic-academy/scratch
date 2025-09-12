/* eslint-disable @typescript-eslint/consistent-type-definitions */
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import Dockerode from "dockerode";
import tar from "tar-stream";

type BuilderOptions = {
  offline?: boolean;
  proxy?: { host: string; port: string | number };
};

type AppOptions = {
  appId: string;
  appName: string;
  scratchHtml: string;
};

type KeystoreOptions = {
  name: string;
  alias: string;
  storePass: string;
};

abstract class Executer {
  private _workdir = "/";

  workdir(path: string) {
    this._workdir = path;
  }

  protected resolveWorkdir() {
    return this._workdir;
  }

  abstract run(
    cmd: string,
    args?: (string | number)[],
    options?: { cwd?: string; env?: NodeJS.ProcessEnv },
  ): Promise<void>;
  abstract writeFile(filePath: string, content: string | Buffer): Promise<void>;
  abstract readFile(filePath: string): Promise<Buffer>;
  abstract rm(dir: string): Promise<void>;
}

function toPosix(p: string) {
  return p.split(path.sep).join(path.posix.sep);
}

export class DockerExecuter extends Executer {
  private docker: Dockerode;
  private _container?: Dockerode.Container;

  constructor() {
    super();
    this.docker = new Dockerode();
  }

  private get container() {
    if (!this._container) throw new Error("Container not started");
    return this._container;
  }

  async start() {
    this._container = await this.docker.createContainer({
      Image: "packager-packager",
      name: "packager-" + crypto.randomUUID(),
      Tty: true,
    });

    await this._container.start();
  }

  async run(
    cmd: string,
    args: (string | number)[] = [],
    options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
  ) {
    const cwd =
      options.cwd && path.isAbsolute(options.cwd)
        ? options.cwd
        : path.join(this.resolveWorkdir(), options.cwd ?? ".");

    const exec = await this.container.exec({
      Cmd: [cmd, ...args.map((a) => a.toString())],
      Env: Object.entries({
        // ...process.env,
        ...options.env,
      }).map(([k, v]) => `${k}=${v}`),
      AttachStdout: true,
      AttachStderr: true,
      WorkingDir: toPosix(cwd),
    });

    const stream = await exec.start({});
    return new Promise<void>((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      this.container.modem.demuxStream(stream, process.stdout, process.stderr);
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      stream.on("end", async () => {
        const inspect = await exec.inspect();
        if (inspect.ExitCode !== 0) {
          reject(new Error(`Command failed: ${cmd} ${args.join(" ")}`));
        } else {
          resolve();
        }
      });
      stream.on("error", reject);
    });
  }

  async writeFile(filePath: string, content: string | Buffer) {
    const dir = toPosix(
      path.join(this.resolveWorkdir(), path.dirname(filePath)),
    );

    await this.run("mkdir", ["-p", dir]);

    const pack = tar.pack();
    pack.entry({ name: path.basename(filePath) }, content);
    pack.finalize();

    const stream = Readable.from(pack);
    await this.container.putArchive(stream, { path: dir });
  }

  async readFile(filePath: string): Promise<Buffer> {
    const containerPath = toPosix(path.join(this.resolveWorkdir(), filePath));

    const stream = await this.container.getArchive({ path: containerPath });

    return new Promise<Buffer>((resolve, reject) => {
      const extract = tar.extract();
      const buf: Buffer[] = [];

      extract.on("entry", (header, entryStream, next) => {
        entryStream.on("data", (d: Buffer) => buf.push(d));
        entryStream.on("end", next);
        entryStream.resume();
      });
      extract.on("finish", () => resolve(Buffer.concat(buf)));
      extract.on("error", reject);

      stream.pipe(extract);
    });
  }

  async rm(dir: string): Promise<void> {
    const p = toPosix(path.join(this.resolveWorkdir(), dir));

    await this.run("rm", ["-fR", p]);
  }

  async remove() {
    try {
      await this.container.stop({ t: 5 }).catch(() => void 0);
      await this.container.remove({ v: true, force: true });
    } catch (cleanupErr) {
      console.error("⚠️ Failed to cleanup container:", cleanupErr);
    }
  }
}

export class LocalExecuter extends Executer {
  async run(
    cmd: string,
    args: (string | number)[] = [],
    options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
  ) {
    await new Promise((resolve, reject) => {
      const child = spawn(
        cmd,
        args.map((a) => a.toString()),
        {
          cwd: this.resolveWorkdir(),
          stdio: "inherit",
          ...options,
          env: {
            ...process.env,
            ...options.env,
          },
        },
      );
      child.on("close", resolve);
      child.on("error", reject);
    });
  }

  async writeFile(filePath: string, content: string | Buffer) {
    await fs.promises.mkdir(
      path.join(this.resolveWorkdir(), path.dirname(filePath)),
      { recursive: true },
    );
    await fs.promises.writeFile(
      path.join(this.resolveWorkdir(), filePath),
      content,
    );
  }

  readFile(filePath: string): Promise<Buffer> {
    return fs.promises.readFile(path.join(this.resolveWorkdir(), filePath));
  }

  async rm(dir: string) {
    await fs.promises.rm(path.join(this.resolveWorkdir(), dir), { force: true, recursive: true });
  }
}

export class Packager {
  static readonly APK_RELEASE_OUTPUT_PATH =
    "./android/app/build/outputs/apk/release/app-release-unsigned.apk";
  static readonly APK_RELEASE_SIGNED_OUTPUT_PATH =
    "./android/app/build/outputs/apk/release/app-release.apk";
  static readonly BUNDLE_RELEASE_OUTPUT_PATH =
    "./android/app/build/outputs/bundle/release/app-release.aab";
  // static readonly KEYSTORE_PATH = "keystore.jks";

  constructor(
    private options: BuilderOptions,
    private executer: Executer,
  ) {}

  async init(options: AppOptions) {
    this.executer.workdir("/app/packages/android-app");

    const scratchPath = path.join("public", "scratch.html");

    await this.executer.writeFile(scratchPath, options.scratchHtml);

    const env = {
      APP_ID: options.appId,
      APP_NAME: options.appName,
    };

    await this.executer.run("pnpm", ["build"], { env });
    await this.executer.run("npx", ["cap", "add", "android"], { env });
    await this.executer.run("npx", ["cap", "sync", "android"], { env });
  }

  async build() {
    const args = ["assembleRelease", "--no-daemon"];

    if (this.options.offline) args.push("--offline");

    if (this.options.proxy) {
      args.push(`-Dhttp.proxyHost=${this.options.proxy.host}`);
      args.push(`-Dhttp.proxyPort=${this.options.proxy.port}`);
      args.push(`-Dhttps.proxyHost=${this.options.proxy.host}`);
      args.push(`-Dhttps.proxyPort=${this.options.proxy.port}`);
    }

    await this.executer.run("./gradlew", args, {
      cwd: "/app/packages/android-app/android",
    });
  }

  async sign(signer: Signer) {
    await signer.signApk(
      Packager.APK_RELEASE_OUTPUT_PATH,
      Packager.APK_RELEASE_SIGNED_OUTPUT_PATH,
    );

    return this.executer.readFile(Packager.APK_RELEASE_SIGNED_OUTPUT_PATH);
  }

  async clear() {
    await this.executer.rm("./android");
  }
}

export class Signer {
  static readonly KEYSTORE_PATH = "keystore.p12";

  constructor(
    private keystore: KeystoreOptions,
    private executer: Executer,
  ) {}

  static async generateKeystore(options: KeystoreOptions, executer: Executer) {
    const args = [
      "-genkeypair",
      "-alias",
      options.alias,
      "-keyalg",
      "RSA",
      "-keysize",
      "2048",
      "-keystore",
      options.name + ".p12",
      "-storepass",
      options.storePass,
      "-validity",
      365 * 99,
      "-dname",
      "CN=Unknown, OU=Unknown, O=Unknown, L=Unknown, ST=Unknown, C=US",
    ];

    await executer.run("keytool", args);

    // store keystore options in signer instance
    return new Signer(options, executer);
  }

  async signApk(apkPath: string, outputPath: string) {
    const args = [
      "sign",
      "--ks",
      this.keystore.name + ".p12",
      "--ks-key-alias",
      this.keystore.alias,
      "--ks-pass",
      `pass:${this.keystore.storePass}`,
      "--out",
      outputPath,
      apkPath,
    ];

    await this.executer.run("apksigner", args);
  }
}
