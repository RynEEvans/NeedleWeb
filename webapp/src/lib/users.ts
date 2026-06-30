import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { CharacterSheet } from "@/lib/character-sheet";

const USERS_DATA_PATH = join(process.cwd(), "data", "users.json");

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

function loadUsers(): UserRecord[] {
  try {
    const fileContents = readFileSync(USERS_DATA_PATH, "utf8");
    return JSON.parse(fileContents) as UserRecord[];
  } catch {
    const fallbackUsers = [] as UserRecord[];
    mkdirSync(dirname(USERS_DATA_PATH), { recursive: true });
    writeFileSync(USERS_DATA_PATH, JSON.stringify(fallbackUsers, null, 2), "utf8");
    return fallbackUsers;
  }
}

function readUsers(): UserRecord[] {
  return loadUsers();
}

function persistUsers() {
  mkdirSync(dirname(USERS_DATA_PATH), { recursive: true });
  writeFileSync(USERS_DATA_PATH, JSON.stringify(users, null, 2), "utf8");
}

let users: UserRecord[] = loadUsers();

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

function toPublicUser(user: UserRecord): PublicUser {
  const publicUser = { ...user } as PublicUser & { password?: string };
  delete publicUser.password;
  return publicUser;
}

export function getPublicUsers(): PublicUser[] {
  users = readUsers();
  return users.map((user) => toPublicUser(user));
}

export function findAdminUser(username: string): UserRecord | undefined {
  users = readUsers();
  const normalizedUsername = normalizeUsername(username);
  return users.find(
    (user) => user.role === "Admin" && normalizeUsername(user.username) === normalizedUsername,
  );
}

export function findUserByUsername(username: string): UserRecord | undefined {
  users = readUsers();
  const normalizedUsername = normalizeUsername(username);
  return users.find((user) => normalizeUsername(user.username) === normalizedUsername);
}

export function findUserByCredentials(
  username: string,
  password: string,
): UserRecord | undefined {
  users = readUsers();
  const normalizedUsername = normalizeUsername(username);
  return users.find(
    (user) => normalizeUsername(user.username) === normalizedUsername && user.password === password,
  );
}

export function getPublicUserByUsername(username: string): PublicUser | undefined {
  const user = findUserByUsername(username);
  if (!user) {
    return undefined;
  }

  return toPublicUser(user);
}

export function updateMemberSheetByUsername(
  username: string,
  updates: {
    email?: string;
    status?: "Active" | "Inactive";
    sheet?: CharacterSheet;
  },
): PublicUser | undefined {
  users = readUsers();
  const user = findUserByUsername(username);
  if (!user) {
    return undefined;
  }

  if (updates.email) {
    user.email = updates.email;
  }

  if (updates.status) {
    user.status = updates.status;
  }

  if (updates.sheet) {
    user.sheet = updates.sheet;
  }

  user.lastActive = new Date().toISOString();
  persistUsers();

  return toPublicUser(user);
}
