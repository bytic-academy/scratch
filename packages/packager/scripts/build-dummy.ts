import fs from "fs";
import path from "path";

import { Packager, Signer } from "../src";
import { LocalExecuter } from "../src/Packager";

const run = async () => {
  const executer = new LocalExecuter();

  const packager = new Packager(
    {
      // proxy: {
      //   host: "192.168.1.103",
      //   port: 8080,
      // },
    },
    executer,
  );

  const icon = await fs.promises.readFile(
    path.join(process.cwd(), "assets", "icon-only.png"),
  );

  await packager.init({
    appId: "com.test.app",
    appName: "Test App",
    scratchHtml: "This is a test app",
    icon,
  });

  await packager.build();

  const signer = await Signer.generateKeystore(
    {
      name: "dummy",
      alias: "myapp_alias",
      storePass: "storePass123",
    },
    executer,
  );

  await packager.sign(signer);

  await packager.clear();
};

void run();
