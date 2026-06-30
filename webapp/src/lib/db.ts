import { Pool } from "pg";
import type { QueryResultRow } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __needleDbPool: Pool | undefined;
}

function normalizeDatabaseUrl(databaseUrl: string): string {
  try {
    const url = new URL(databaseUrl);
    const sslmode = url.searchParams.get("sslmode")?.toLowerCase();

    if (!sslmode || sslmode === "prefer" || sslmode === "require" || sslmode === "verify-ca") {
      url.searchParams.set("sslmode", "verify-full");
    }

    return url.toString();
  } catch {
    return databaseUrl;
  }
}

function getPool(): Pool {
  if (global.__needleDbPool) {
    return global.__needleDbPool;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required.");
  }

  const pool = new Pool({
    connectionString: normalizeDatabaseUrl(connectionString),
    max: 10,
  });

  if (process.env.NODE_ENV !== "production") {
    global.__needleDbPool = pool;
  }

  return pool;
}

export const db = {
  connect: () => getPool().connect(),
};

export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await getPool().query<T>(text, params);
  return result.rows;
}
