import { Packager, Signer } from "../src";
import { LocalExecuter } from "../src/Packager";

const run = async () => {
  const executer = new LocalExecuter();

  const packager = new Packager(
    {
      proxy: {
        host: "192.168.100.96",
        port: 8080,
      },
    },
    executer,
  );

  await packager.init({
    appId: "com.test.app",
    appName: "Test App",
    scratchHtml: "",
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
