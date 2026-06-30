import { createHmac, timingSafeEqual } from "node:crypto";
import type { UserRecord } from "@/lib/users";

export const SESSION_COOKIE_NAME = "admin_session";

const SESSION_TTL_SECONDS = 60 * 60 * 8;
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET ?? "change-me-in-env";

export type SessionClaims = {
  username: string;
  role: UserRecord["role"];
};

function sign(value: string): string {
  return createHmac("sha256", SESSION_SECRET).update(value).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return timingSafeEqual(aBuffer, bBuffer);
}

export function createSessionToken(username: string): string {
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  const payload = `${username}.Admin.${expiresAt}`;
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function createSessionTokenWithRole(
  username: string,
  role: UserRecord["role"],
): string {
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  const payload = `${username}.${role}.${expiresAt}`;
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function readSessionClaims(token?: string): SessionClaims | null {
  if (!token) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 4) {
    return null;
  }

  const [username, roleRaw, expiresAtRaw, signature] = parts;
  const payload = `${username}.${roleRaw}.${expiresAtRaw}`;
  const expectedSignature = sign(payload);

  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt)) {
    return null;
  }

  if (expiresAt <= Date.now()) {
    return null;
  }

  if (roleRaw !== "Admin" && roleRaw !== "Member" && roleRaw !== "Guest") {
    return null;
  }

  return {
    username,
    role: roleRaw,
  };
}

export function verifySessionToken(token?: string): boolean {
  return readSessionClaims(token) !== null;
}

export function getSessionTtlSeconds(): number {
  return SESSION_TTL_SECONDS;
}
