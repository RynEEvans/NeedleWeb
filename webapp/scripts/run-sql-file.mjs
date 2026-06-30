import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import pg from "pg";

const { Client } = pg;

function normalizeDatabaseUrl(databaseUrl) {
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

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to run SQL scripts.");
  }

  const sqlFile = process.argv[2] ?? "sql/001_init.sql";
  const sqlPath = resolve(process.cwd(), sqlFile);
  const sql = await readFile(sqlPath, "utf8");

  const client = new Client({ connectionString: normalizeDatabaseUrl(databaseUrl) });
  await client.connect();

  try {
    await client.query(sql);
    // eslint-disable-next-line no-console
    console.log(`Applied SQL file: ${sqlFile}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
