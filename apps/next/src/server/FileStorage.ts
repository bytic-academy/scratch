import fs from "fs";
import { join, resolve } from "path";
import { cwd } from "process";

export class FileStorage {
  private getProjectDir(projectId: string) {
    return join(cwd(), "data", "projects", projectId);
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

  async removeProjectData(projectId: string) {
    await fs.promises.rm(this.getProjectDir(projectId), {
      force: true,
      recursive: true,
    });
  }
}
