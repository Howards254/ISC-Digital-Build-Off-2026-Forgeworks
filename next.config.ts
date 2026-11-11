import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The shared header reads the signed-in session, so these routes are
  // intentionally rendered per request rather than partial-prerendered.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
