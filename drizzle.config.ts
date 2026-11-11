import { setDefaultResultOrder } from "node:dns";
import { setDefaultAutoSelectFamily } from "node:net";

import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Neon hostnames publish both A and AAAA records. Prefer IPv4 and do not race
// an unreachable IPv6 address, which otherwise stalls migration runs on
// IPv4-only hosts.
setDefaultResultOrder("ipv4first");
setDefaultAutoSelectFamily(false);

config({ path: ".env.local" });
config();

if (!process.env.DATABASE_URL && !process.env.DATABASE_URL_UNPOOLED) {
  throw new Error(
    "DATABASE_URL or DATABASE_URL_UNPOOLED is required. Add it to .env.local or export it before running Drizzle.",
  );
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Migrations need a direct connection; PgBouncer's transaction pooling can
    // break session-level operations used by schema changes.
    url: (process.env.DATABASE_URL_UNPOOLED ??
      process.env.DATABASE_URL) as string,
  },
  strict: true,
  verbose: true,
});
