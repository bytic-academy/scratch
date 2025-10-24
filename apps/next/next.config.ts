/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import type { NextConfig } from "next";

import "./src/env";

const config: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@turbowarp/packager", "dockerode"],
};

export default config;
