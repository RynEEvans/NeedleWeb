import { NextRequest, NextResponse } from "next/server";
import {
  createSessionTokenWithRole,
  getSessionTtlSeconds,
  SESSION_COOKIE_NAME,
} from "@/lib/admin-auth";
import { findUserByCredentials } from "@/lib/users";

type LoginBody = {
  username?: string;
  password?: string;
};

function buildRedirectUrl(request: NextRequest, path: string): URL {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? "http";

  if (host) {
    return new URL(path, `${protocol}://${host}`);
  }

  return new URL(path, request.nextUrl.origin);
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  const expectsRedirect =
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data");

  let username: string | undefined;
  let password: string | undefined;

  if (expectsRedirect) {
    const formData = await request.formData();
    const rawUsername = formData.get("username");
    const rawPassword = formData.get("password");
    username = typeof rawUsername === "string" ? rawUsername.trim() : undefined;
    password = typeof rawPassword === "string" ? rawPassword : undefined;
  } else {
    const body = (await request.json()) as LoginBody;
    username = body.username?.trim();
    password = body.password;
  }

  const redirectWithError = (message: string, status: number) => {
    if (!expectsRedirect) {
      return NextResponse.json({ error: message }, { status });
    }

    const errorUrl = buildRedirectUrl(request, "/sign-in");
    errorUrl.searchParams.set("error", message);
    return NextResponse.redirect(errorUrl, 303);
  };

  if (!username || !password) {
    return redirectWithError("Username and password are required.", 400);
  }

  const user = await findUserByCredentials(username, password);
  if (!user) {
    return redirectWithError("Invalid credentials.", 401);
  }

  if (user.role !== "Admin" && user.role !== "Member") {
    return redirectWithError("This account cannot access the app dashboard.", 403);
  }

  const response = expectsRedirect
    ? NextResponse.redirect(buildRedirectUrl(request, user.role === "Admin" ? "/admin" : "/member"), 303)
    : NextResponse.json({ ok: true, role: user.role });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: createSessionTokenWithRole(user.username, user.role),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getSessionTtlSeconds(),
  });

  return response;
}
