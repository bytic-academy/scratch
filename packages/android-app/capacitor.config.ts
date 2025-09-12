import type { CapacitorConfig } from "@capacitor/cli";

import { env } from "./src/env";

const config: CapacitorConfig = {
  appId: env.APP_ID,
  appName: env.APP_NAME,
  webDir: "dist",
};

export default config;
