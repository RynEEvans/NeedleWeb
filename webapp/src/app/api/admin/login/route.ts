import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  getSessionTtlSeconds,
  SESSION_COOKIE_NAME,
} from "@/lib/admin-auth";
import { findAdminUser } from "@/lib/users";

type LoginBody = {
  username?: string;
  password?: string;
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as LoginBody;
  const username = body.username?.trim();
  const password = body.password;

  if (!username || !password) {
    return NextResponse.json(
      { error: "Username and password are required." },
      { status: 400 },
    );
  }

  const adminUser = await findAdminUser(username);
  if (!adminUser || adminUser.password !== password) {
    return NextResponse.json(
      { error: "Invalid admin credentials." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: createSessionToken(adminUser.username),
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getSessionTtlSeconds(),
  });

  return response;
}
