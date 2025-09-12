import fs from "fs";
import path from "path";

import { Packager, Signer } from "../src";
import { DockerExecuter } from "../src/Packager";

const run = async () => {
  const executer = new DockerExecuter();

  await executer.start();

  try {
    const packager = new Packager(
      {
        offline: true,
        proxy: {
          host: "192.168.100.96",
          port: 8080,
        },
      },
      executer,
    );

    await packager.init({
      appId: "com.test4.app",
      appName: "Test 4 Appy",
      scratchHtml: "Hello World",
    });

    await packager.build();

    const signer = await Signer.generateKeystore(
      {
        name: "test4",
        alias: "myapp_alias4",
        storePass: "storePass1234",
      },
      executer,
    );

    const app = await packager.sign(signer);

    const dir = path.join(process.cwd(), "/outputs");
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(path.join(dir, "test4.apk"), app);
  } finally {
    await executer.remove();
  }
};

void run();
