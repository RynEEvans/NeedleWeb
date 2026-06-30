import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import pg from "pg";

const { Client } = pg;

async function readJson(relativePath) {
  const fullPath = resolve(process.cwd(), relativePath);
  const raw = await readFile(fullPath, "utf8");
  return JSON.parse(raw);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to import JSON data.");
  }

  const users = await readJson("data/users.json");
  const signupRequests = await readJson("data/signup-requests.json").catch(() => []);

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query("BEGIN");

    await client.query("DELETE FROM signup_requests");
    await client.query("DELETE FROM users");

    for (const user of users) {
      await client.query(
        `INSERT INTO users (
          id, username, password, email, role, status, joined_date, last_active, sheet
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
        [
          user.id,
          user.username,
          user.password,
          user.email,
          user.role,
          user.status,
          user.joinedDate,
          user.lastActive,
          JSON.stringify(user.sheet),
        ],
      );
    }

    for (const request of signupRequests) {
      await client.query(
        `INSERT INTO signup_requests (
          id, username, email, password, message, requested_at, status,
          approved_by, approved_at, rejected_by, rejected_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          request.id,
          request.username,
          request.email,
          request.password,
          request.message ?? "",
          request.requestedAt,
          request.status,
          request.approvedBy ?? null,
          request.approvedAt ?? null,
          request.rejectedBy ?? null,
          request.rejectedAt ?? null,
        ],
      );
    }

    await client.query(
      "SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM users), 1), true)",
    );
    await client.query(
      "SELECT setval(pg_get_serial_sequence('signup_requests', 'id'), COALESCE((SELECT MAX(id) FROM signup_requests), 1), true)",
    );

    await client.query("COMMIT");
    // eslint-disable-next-line no-console
    console.log(`Imported ${users.length} users and ${signupRequests.length} signup requests.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
