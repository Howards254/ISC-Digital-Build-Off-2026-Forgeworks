import { setDefaultResultOrder } from "node:dns";
import { setDefaultAutoSelectFamily } from "node:net";

import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

// Neon hostnames publish both A and AAAA records. Prefer IPv4 and do not race
// an unreachable IPv6 address, which otherwise stalls the pool on IPv4-only
// hosts.
setDefaultResultOrder("ipv4first");
setDefaultAutoSelectFamily(false);

type VulcanDb = ReturnType<typeof createDb>;

function createDb() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add your Neon Postgres connection string to the environment.",
    );
  }

  // Vercel Fluid compute keeps functions warm, so a pooled TCP connection is
  // faster than the HTTP driver after the first request. attachDatabasePool
  // releases idle connections before Vercel suspends the function.
  const pool = new Pool({ connectionString });
  attachDatabasePool(pool);

  return drizzle(pool, { schema });
}

const globalForDb = globalThis as typeof globalThis & {
  __vulcanDb?: VulcanDb;
};

/**
 * Create the database client on first use so builds and public pages do not
 * require a database connection before one is actually needed.
 */
export function getDb(): VulcanDb {
  if (!globalForDb.__vulcanDb) {
    globalForDb.__vulcanDb = createDb();
  }

  return globalForDb.__vulcanDb;
}
