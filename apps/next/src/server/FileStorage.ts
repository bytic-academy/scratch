import fs from "fs";
import { join, resolve } from "path";
import { cwd } from "process";

export class FileStorage {
  private getProjectDir(projectId: string) {
    return join(cwd(), "data", "projects", projectId);
  }

  async saveProjectKeystore(projectId: string, keystore: Buffer | Uint8Array) {
    await fs.promises.mkdir(this.getProjectDir(projectId), { recursive: true });

    await fs.promises.writeFile(
      join(this.getProjectDir(projectId), "keystore.p12"),
      keystore,
    );
  }

  async getProjectKeystore(projectId: string) {
    try {
      const data = await fs.promises.readFile(
        join(this.getProjectDir(projectId), "keystore.p12"),
      );

      return data;
    } catch {
      return null;
    }
  }

  async saveProjectIcon(projectId: string, icon: Buffer) {
    await fs.promises.mkdir(this.getProjectDir(projectId), { recursive: true });

    await fs.promises.writeFile(
      join(this.getProjectDir(projectId), "icon.png"),
      icon,
    );
  }

  async getProjectIcon(projectId: string) {
    try {
      const data = await fs.promises.readFile(
        join(this.getProjectDir(projectId), "icon.png"),
      );

      return data;
    } catch {
      return null;
    }
  }

  async saveProjectScratchSource(projectId: string, scratchSource: Buffer) {
    await fs.promises.mkdir(this.getProjectDir(projectId), { recursive: true });

    await fs.promises.writeFile(
      join(this.getProjectDir(projectId), "source.sb3"),
      scratchSource,
    );
  }

  async getProjectScratchSource(projectId: string) {
    try {
      const data = await fs.promises.readFile(
        join(this.getProjectDir(projectId), "source.sb3"),
      );

      return data;
    } catch {
      return null;
    }
  }

  async saveProjectApk(projectId: string, apk: Buffer) {
    await fs.promises.mkdir(this.getProjectDir(projectId), { recursive: true });

    await fs.promises.writeFile(
      join(this.getProjectDir(projectId), "app.apk"),
      apk,
    );
  }

  async getProjectApk(projectId: string) {
    try {
      const data = await fs.promises.readFile(
        join(this.getProjectDir(projectId), "app.apk"),
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
