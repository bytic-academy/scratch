import fs from "fs";
import { join } from "path";
import { cwd } from "process";
import * as BlobStorage from "@vercel/blob";

import { env } from "~/env";

class LocalFileStorageAPI {
  private getProjectDir(projectId: string) {
    return join(cwd(), "data", "projects", projectId);
  }

  protected async writeFile(
    projectId: string,
    fileName: string,
    data: Buffer | Uint8Array,
  ) {
    await fs.promises.mkdir(this.getProjectDir(projectId), { recursive: true });

    await fs.promises.writeFile(
      join(this.getProjectDir(projectId), fileName),
      data,
    );
  }

  protected async readFile(projectId: string, fileName: string) {
    try {
      const data = await fs.promises.readFile(
        join(this.getProjectDir(projectId), fileName),
      );
      return data;
    } catch {
      return null;
    }
  }

  async removeProjectData(projectId: string) {
    await fs.promises.rm(this.getProjectDir(projectId), {
      force: true,
      recursive: true,
    });
  }
}

class BlobStorageAPI {
  private getBlobKey(projectId: string, fileName: string) {
    return `projects/${projectId}/${fileName}`;
  }

  protected async writeFile(
    projectId: string,
    fileName: string,
    data: Buffer | ArrayBuffer,
  ) {
    const key = this.getBlobKey(projectId, fileName);
    await BlobStorage.put(key, data, {
      access: "public",
      allowOverwrite: true,
      cacheControlMaxAge: 1,
      token: env.BLOB_READ_WRITE_TOKEN,
    });
  }

  protected async readFile(projectId: string, fileName: string) {
    const key = this.getBlobKey(projectId, fileName);
    try {
      const data = await BlobStorage.head(key, {
        token: env.BLOB_READ_WRITE_TOKEN,
      });
      return data;
    } catch {
      return null;
    }
  }

  async removeProjectData(projectId: string) {
    const prefix = `projects/${projectId}/`;
    const { blobs } = await BlobStorage.list({
      prefix,
      token: env.BLOB_READ_WRITE_TOKEN,
    });

    await Promise.all(
      blobs.map((blob) =>
        BlobStorage.del(blob.pathname, { token: env.BLOB_READ_WRITE_TOKEN }),
      ),
    );
  }
}

export class FileStorage extends BlobStorageAPI {
  async saveProjectKeystore(projectId: string, keystore: Buffer | Uint8Array) {
    await this.writeFile(projectId, "keystore.p12", keystore);
  }

  async getProjectKeystore(projectId: string) {
    return this.readFile(projectId, "keystore.p12");
  }

  async saveProjectIcon(projectId: string, icon: Buffer) {
    await this.writeFile(projectId, "icon.png", icon);
  }

  async getProjectIcon(projectId: string) {
    return this.readFile(projectId, "icon.png");
  }

  async saveProjectScratchSource(projectId: string, scratchSource: Buffer) {
    await this.writeFile(projectId, "source.sb3", scratchSource);
  }

  async getProjectScratchSource(projectId: string) {
    return this.readFile(projectId, "source.sb3");
  }

  async saveProjectApk(projectId: string, apk: Buffer) {
    await this.writeFile(projectId, "app.apk", apk);
  }

  async getProjectApk(projectId: string) {
    return this.readFile(projectId, "app.apk");
  }
}
