import { CharacterSheet, createEmptyCharacterSheet } from "@/lib/character-sheet";
import { db, query } from "@/lib/db";

export type UserRecord = {
  id: number;
  username: string;
  password: string;
  email: string;
  role: "Admin" | "Member" | "Guest";
  status: "Online" | "Active" | "Inactive" | "Invited";
  joinedDate: string;
  lastActive: string | null;
  sheet: CharacterSheet;
};

export type PublicUser = Omit<UserRecord, "password">;

export type SignupRequestRecord = {
  id: number;
  username: string;
  email: string;
  password: string;
  message: string;
  requestedAt: string;
  status: "Pending" | "Approved" | "Rejected";
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
};

export type PublicSignupRequest = Omit<SignupRequestRecord, "password">;

type UserRow = {
  id: number;
  username: string;
  password: string;
  email: string;
  role: UserRecord["role"];
  status: UserRecord["status"];
  joined_date: string;
  last_active: string | null;
  sheet: CharacterSheet;
};

type SignupRequestRow = {
  id: number;
  username: string;
  email: string;
  password: string;
  message: string;
  requested_at: string;
  status: SignupRequestRecord["status"];
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
};

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

function mapUserRow(row: UserRow): UserRecord {
  return {
    id: row.id,
    username: row.username,
    password: row.password,
    email: row.email,
    role: row.role,
    status: row.status,
    joinedDate: row.joined_date,
    lastActive: row.last_active,
    sheet: row.sheet,
  };
}

function mapSignupRequestRow(row: SignupRequestRow): SignupRequestRecord {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    password: row.password,
    message: row.message,
    requestedAt: row.requested_at,
    status: row.status,
    approvedBy: row.approved_by ?? undefined,
    approvedAt: row.approved_at ?? undefined,
    rejectedBy: row.rejected_by ?? undefined,
    rejectedAt: row.rejected_at ?? undefined,
  };
}

function toPublicUser(user: UserRecord): PublicUser {
  const publicUser = { ...user } as PublicUser & { password?: string };
  delete publicUser.password;
  return publicUser;
}

function toPublicSignupRequest(request: SignupRequestRecord): PublicSignupRequest {
  const publicRequest = { ...request } as PublicSignupRequest & { password?: string };
  delete publicRequest.password;
  return publicRequest;
}

export async function getPublicUsers(): Promise<PublicUser[]> {
  const rows = await query<UserRow>("SELECT * FROM users ORDER BY id ASC");
  return rows.map((row) => toPublicUser(mapUserRow(row)));
}

export async function getPublicSignupRequests(): Promise<PublicSignupRequest[]> {
  const rows = await query<SignupRequestRow>("SELECT * FROM signup_requests ORDER BY id ASC");
  return rows.map((row) => toPublicSignupRequest(mapSignupRequestRow(row)));
}

export async function findAdminUser(username: string): Promise<UserRecord | undefined> {
  const rows = await query<UserRow>(
    "SELECT * FROM users WHERE role = 'Admin' AND lower(username) = $1 LIMIT 1",
    [normalizeUsername(username)],
  );

  return rows[0] ? mapUserRow(rows[0]) : undefined;
}

export async function findUserByUsername(username: string): Promise<UserRecord | undefined> {
  const rows = await query<UserRow>("SELECT * FROM users WHERE lower(username) = $1 LIMIT 1", [
    normalizeUsername(username),
  ]);

  return rows[0] ? mapUserRow(rows[0]) : undefined;
}

export async function findUserByCredentials(
  username: string,
  password: string,
): Promise<UserRecord | undefined> {
  const rows = await query<UserRow>(
    "SELECT * FROM users WHERE lower(username) = $1 AND password = $2 LIMIT 1",
    [normalizeUsername(username), password],
  );

  return rows[0] ? mapUserRow(rows[0]) : undefined;
}

export async function createSignupRequest(input: {
  username: string;
  email: string;
  password: string;
  message?: string;
}): Promise<PublicSignupRequest> {
  const normalizedUsername = normalizeUsername(input.username);
  const normalizedEmail = input.email.trim().toLowerCase();

  if (!normalizedUsername || !normalizedEmail || !input.password.trim()) {
    throw new Error("Username, email, and password are required.");
  }

  const usernameTaken = await query<{ exists: boolean }>(
    "SELECT EXISTS(SELECT 1 FROM users WHERE lower(username) = $1) AS exists",
    [normalizedUsername],
  );
  if (usernameTaken[0]?.exists) {
    throw new Error("Username is already taken.");
  }

  const emailTaken = await query<{ exists: boolean }>(
    "SELECT EXISTS(SELECT 1 FROM users WHERE lower(email) = $1) AS exists",
    [normalizedEmail],
  );
  if (emailTaken[0]?.exists) {
    throw new Error("Email is already in use.");
  }

  const pendingExists = await query<{ exists: boolean }>(
    `SELECT EXISTS(
      SELECT 1 FROM signup_requests
      WHERE status = 'Pending' AND (lower(username) = $1 OR lower(email) = $2)
    ) AS exists`,
    [normalizedUsername, normalizedEmail],
  );
  if (pendingExists[0]?.exists) {
    throw new Error("A pending signup request already exists for this username or email.");
  }

  const rows = await query<SignupRequestRow>(
    `INSERT INTO signup_requests (
      username, email, password, message, requested_at, status
    ) VALUES ($1, $2, $3, $4, NOW(), 'Pending') RETURNING *`,
    [input.username.trim(), input.email.trim(), input.password, input.message?.trim() ?? ""],
  );

  return toPublicSignupRequest(mapSignupRequestRow(rows[0]));
}

export async function approveSignupRequest(
  requestId: number,
  reviewerUsername: string,
): Promise<PublicUser> {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const requestRows = await client.query<SignupRequestRow>(
      "SELECT * FROM signup_requests WHERE id = $1 FOR UPDATE",
      [requestId],
    );
    const request = requestRows.rows[0];

    if (!request) {
      throw new Error("Signup request not found.");
    }

    if (request.status !== "Pending") {
      throw new Error("Only pending signup requests can be approved.");
    }

    const normalizedUsername = normalizeUsername(request.username);
    const normalizedEmail = request.email.trim().toLowerCase();

    const usernameConflict = await client.query<{ exists: boolean }>(
      "SELECT EXISTS(SELECT 1 FROM users WHERE lower(username) = $1) AS exists",
      [normalizedUsername],
    );
    if (usernameConflict.rows[0]?.exists) {
      throw new Error("Cannot approve request: username already exists.");
    }

    const emailConflict = await client.query<{ exists: boolean }>(
      "SELECT EXISTS(SELECT 1 FROM users WHERE lower(email) = $1) AS exists",
      [normalizedEmail],
    );
    if (emailConflict.rows[0]?.exists) {
      throw new Error("Cannot approve request: email already exists.");
    }

    const userInsert = await client.query<UserRow>(
      `INSERT INTO users (
        username, password, email, role, status, joined_date, last_active, sheet
      ) VALUES ($1, $2, $3, 'Member', 'Active', CURRENT_DATE, NULL, $4::jsonb)
      RETURNING *`,
      [request.username, request.password, request.email, JSON.stringify(createEmptyCharacterSheet())],
    );

    await client.query(
      `UPDATE signup_requests
       SET status = 'Approved', approved_by = $2, approved_at = NOW(), rejected_by = NULL, rejected_at = NULL
       WHERE id = $1`,
      [requestId, reviewerUsername],
    );

    await client.query("COMMIT");
    return toPublicUser(mapUserRow(userInsert.rows[0]));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function rejectSignupRequest(
  requestId: number,
  reviewerUsername: string,
): Promise<PublicSignupRequest> {
  const rows = await query<SignupRequestRow>("SELECT * FROM signup_requests WHERE id = $1 LIMIT 1", [
    requestId,
  ]);
  const request = rows[0];

  if (!request) {
    throw new Error("Signup request not found.");
  }

  if (request.status !== "Pending") {
    throw new Error("Only pending signup requests can be rejected.");
  }

  const updated = await query<SignupRequestRow>(
    `UPDATE signup_requests
     SET status = 'Rejected', rejected_by = $2, rejected_at = NOW(), approved_by = NULL, approved_at = NULL
     WHERE id = $1
     RETURNING *`,
    [requestId, reviewerUsername],
  );

  return toPublicSignupRequest(mapSignupRequestRow(updated[0]));
}

export async function createMemberUser(input: {
  username: string;
  email: string;
  password: string;
}): Promise<PublicUser> {
  const normalizedUsername = normalizeUsername(input.username);
  const normalizedEmail = input.email.trim().toLowerCase();

  if (!normalizedUsername || !normalizedEmail || !input.password.trim()) {
    throw new Error("Username, email, and password are required.");
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const usernameTaken = await client.query<{ exists: boolean }>(
      "SELECT EXISTS(SELECT 1 FROM users WHERE lower(username) = $1) AS exists",
      [normalizedUsername],
    );
    if (usernameTaken.rows[0]?.exists) {
      throw new Error("Username is already taken.");
    }

    const emailTaken = await client.query<{ exists: boolean }>(
      "SELECT EXISTS(SELECT 1 FROM users WHERE lower(email) = $1) AS exists",
      [normalizedEmail],
    );
    if (emailTaken.rows[0]?.exists) {
      throw new Error("Email is already in use.");
    }

    const createdUser = await client.query<UserRow>(
      `INSERT INTO users (
        username, password, email, role, status, joined_date, last_active, sheet
      ) VALUES ($1, $2, $3, 'Member', 'Active', CURRENT_DATE, NULL, $4::jsonb)
      RETURNING *`,
      [
        input.username.trim(),
        input.password,
        input.email.trim(),
        JSON.stringify(createEmptyCharacterSheet()),
      ],
    );

    await client.query(
      `UPDATE signup_requests
       SET status = 'Approved', approved_by = 'System', approved_at = NOW(), rejected_by = NULL, rejected_at = NULL
       WHERE status = 'Pending' AND (lower(username) = $1 OR lower(email) = $2)`,
      [normalizedUsername, normalizedEmail],
    );

    await client.query("COMMIT");
    return toPublicUser(mapUserRow(createdUser.rows[0]));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteUserByUsername(username: string): Promise<PublicUser> {
  const deleted = await query<UserRow>(
    "DELETE FROM users WHERE lower(username) = $1 AND role <> 'Admin' RETURNING *",
    [normalizeUsername(username)],
  );

  if (deleted[0]) {
    return toPublicUser(mapUserRow(deleted[0]));
  }

  const existing = await query<{ role: UserRecord["role"] }>(
    "SELECT role FROM users WHERE lower(username) = $1 LIMIT 1",
    [normalizeUsername(username)],
  );

  if (!existing[0]) {
    throw new Error("User not found.");
  }

  if (existing[0].role === "Admin") {
    throw new Error("Admin users cannot be deleted.");
  }

  throw new Error("Unable to delete user.");
}

export async function getPublicUserByUsername(username: string): Promise<PublicUser | undefined> {
  const user = await findUserByUsername(username);
  return user ? toPublicUser(user) : undefined;
}

export async function updateMemberSheetByUsername(
  username: string,
  updates: {
    email?: string;
    status?: "Active" | "Inactive";
    sheet?: CharacterSheet;
  },
): Promise<PublicUser | undefined> {
  const rows = await query<UserRow>(
    `UPDATE users
     SET
       email = COALESCE($2, email),
       status = COALESCE($3, status),
       sheet = COALESCE($4::jsonb, sheet),
       last_active = NOW()
     WHERE lower(username) = $1
     RETURNING *`,
    [
      normalizeUsername(username),
      updates.email ?? null,
      updates.status ?? null,
      updates.sheet ? JSON.stringify(updates.sheet) : null,
    ],
  );

  if (!rows[0]) {
    return undefined;
  }

  return toPublicUser(mapUserRow(rows[0]));
}
