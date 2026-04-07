import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

/** Pin Turbopack to this app when another lockfile exists higher in the tree (e.g. monorepo / home dir). */
const turbopackRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: turbopackRoot,
  },
};

export default nextConfig;
