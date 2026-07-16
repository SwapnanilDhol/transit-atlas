import type { NextConfig } from "next";
import { resolve } from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    // Dependencies are hoisted by npm workspaces, so Turbopack must resolve
    // packages from the repository root rather than apps/web/app.
    root: resolve(import.meta.dirname, "../.."),
  },
};

export default nextConfig;
