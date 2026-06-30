import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { CharacterSheet, createEmptyCharacterSheet } from "@/lib/character-sheet";

const USERS_DATA_PATH = join(process.cwd(), "data", "users.json");
const SIGNUP_REQUESTS_DATA_PATH = join(process.cwd(), "data", "signup-requests.json");

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

function loadSignupRequests(): SignupRequestRecord[] {
  try {
    const fileContents = readFileSync(SIGNUP_REQUESTS_DATA_PATH, "utf8");
    return JSON.parse(fileContents) as SignupRequestRecord[];
  } catch {
    const fallbackRequests = [] as SignupRequestRecord[];
    mkdirSync(dirname(SIGNUP_REQUESTS_DATA_PATH), { recursive: true });
    writeFileSync(SIGNUP_REQUESTS_DATA_PATH, JSON.stringify(fallbackRequests, null, 2), "utf8");
    return fallbackRequests;
  }
}

function readSignupRequests(): SignupRequestRecord[] {
  return loadSignupRequests();
}

function persistUsers() {
  mkdirSync(dirname(USERS_DATA_PATH), { recursive: true });
  writeFileSync(USERS_DATA_PATH, JSON.stringify(users, null, 2), "utf8");
}

function persistSignupRequests() {
  mkdirSync(dirname(SIGNUP_REQUESTS_DATA_PATH), { recursive: true });
  writeFileSync(SIGNUP_REQUESTS_DATA_PATH, JSON.stringify(signupRequests, null, 2), "utf8");
}

let users: UserRecord[] = loadUsers();
let signupRequests: SignupRequestRecord[] = loadSignupRequests();

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
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

function getNextUserId() {
  return users.reduce((maxId, user) => Math.max(maxId, user.id), 0) + 1;
}

function getNextSignupRequestId() {
  return signupRequests.reduce((maxId, request) => Math.max(maxId, request.id), 0) + 1;
}

export function getPublicUsers(): PublicUser[] {
  users = readUsers();
  return users.map((user) => toPublicUser(user));
}

export function getPublicSignupRequests(): PublicSignupRequest[] {
  signupRequests = readSignupRequests();
  return signupRequests.map((request) => toPublicSignupRequest(request));
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

export function createSignupRequest(input: {
  username: string;
  email: string;
  password: string;
  message?: string;
}): PublicSignupRequest {
  users = readUsers();
  signupRequests = readSignupRequests();

  const normalizedUsername = normalizeUsername(input.username);
  const normalizedEmail = input.email.trim().toLowerCase();

  if (!normalizedUsername || !normalizedEmail || !input.password.trim()) {
    throw new Error("Username, email, and password are required.");
  }

  if (users.some((user) => normalizeUsername(user.username) === normalizedUsername)) {
    throw new Error("Username is already taken.");
  }

  if (users.some((user) => user.email.trim().toLowerCase() === normalizedEmail)) {
    throw new Error("Email is already in use.");
  }

  if (
    signupRequests.some(
      (request) =>
        request.status === "Pending" &&
        (normalizeUsername(request.username) === normalizedUsername ||
          request.email.trim().toLowerCase() === normalizedEmail),
    )
  ) {
    throw new Error("A pending signup request already exists for this username or email.");
  }

  const createdRequest: SignupRequestRecord = {
    id: getNextSignupRequestId(),
    username: input.username.trim(),
    email: input.email.trim(),
    password: input.password,
    message: input.message?.trim() ?? "",
    requestedAt: new Date().toISOString(),
    status: "Pending",
  };

  signupRequests.push(createdRequest);
  persistSignupRequests();
  return toPublicSignupRequest(createdRequest);
}

export function approveSignupRequest(requestId: number, reviewerUsername: string): PublicUser {
  users = readUsers();
  signupRequests = readSignupRequests();

  const request = signupRequests.find((item) => item.id === requestId);
  if (!request) {
    throw new Error("Signup request not found.");
  }

  if (request.status !== "Pending") {
    throw new Error("Only pending signup requests can be approved.");
  }

  const normalizedUsername = normalizeUsername(request.username);
  const normalizedEmail = request.email.trim().toLowerCase();

  if (users.some((user) => normalizeUsername(user.username) === normalizedUsername)) {
    throw new Error("Cannot approve request: username already exists.");
  }

  if (users.some((user) => user.email.trim().toLowerCase() === normalizedEmail)) {
    throw new Error("Cannot approve request: email already exists.");
  }

  const createdUser: UserRecord = {
    id: getNextUserId(),
    username: request.username,
    password: request.password,
    email: request.email,
    role: "Member",
    status: "Active",
    joinedDate: new Date().toISOString().slice(0, 10),
    lastActive: null,
    sheet: createEmptyCharacterSheet(),
  };

  users.push(createdUser);
  request.status = "Approved";
  request.approvedBy = reviewerUsername;
  request.approvedAt = new Date().toISOString();
  delete request.rejectedBy;
  delete request.rejectedAt;
  persistUsers();
  persistSignupRequests();
  return toPublicUser(createdUser);
}

export function rejectSignupRequest(requestId: number, reviewerUsername: string): PublicSignupRequest {
  signupRequests = readSignupRequests();

  const request = signupRequests.find((item) => item.id === requestId);
  if (!request) {
    throw new Error("Signup request not found.");
  }

  if (request.status !== "Pending") {
    throw new Error("Only pending signup requests can be rejected.");
  }

  request.status = "Rejected";
  request.rejectedBy = reviewerUsername;
  request.rejectedAt = new Date().toISOString();
  delete request.approvedBy;
  delete request.approvedAt;
  persistSignupRequests();
  return toPublicSignupRequest(request);
}

export function createMemberUser(input: {
  username: string;
  email: string;
  password: string;
}): PublicUser {
  users = readUsers();
  signupRequests = readSignupRequests();

  const normalizedUsername = normalizeUsername(input.username);
  const normalizedEmail = input.email.trim().toLowerCase();

  if (!normalizedUsername || !normalizedEmail || !input.password.trim()) {
    throw new Error("Username, email, and password are required.");
  }

  if (users.some((user) => normalizeUsername(user.username) === normalizedUsername)) {
    throw new Error("Username is already taken.");
  }

  if (users.some((user) => user.email.trim().toLowerCase() === normalizedEmail)) {
    throw new Error("Email is already in use.");
  }

  const createdUser: UserRecord = {
    id: getNextUserId(),
    username: input.username.trim(),
    password: input.password,
    email: input.email.trim(),
    role: "Member",
    status: "Active",
    joinedDate: new Date().toISOString().slice(0, 10),
    lastActive: null,
    sheet: createEmptyCharacterSheet(),
  };

  users.push(createdUser);
  persistUsers();

  for (const request of signupRequests) {
    if (
      request.status === "Pending" &&
      (normalizeUsername(request.username) === normalizedUsername ||
        request.email.trim().toLowerCase() === normalizedEmail)
    ) {
      request.status = "Approved";
      request.approvedBy = "System";
      request.approvedAt = new Date().toISOString();
      delete request.rejectedBy;
      delete request.rejectedAt;
    }
  }
  persistSignupRequests();

  return toPublicUser(createdUser);
}

export function deleteUserByUsername(username: string): PublicUser {
  users = readUsers();
  const normalizedUsername = normalizeUsername(username);

  const index = users.findIndex((user) => normalizeUsername(user.username) === normalizedUsername);
  if (index === -1) {
    throw new Error("User not found.");
  }

  const user = users[index];
  if (user.role === "Admin") {
    throw new Error("Admin users cannot be deleted.");
  }

  users.splice(index, 1);
  persistUsers();
  return toPublicUser(user);
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
