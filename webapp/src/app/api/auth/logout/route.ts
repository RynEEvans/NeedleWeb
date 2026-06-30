import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/admin-auth";
import { buildAbsoluteUrlFromRequest } from "@/lib/request-url";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(buildAbsoluteUrlFromRequest(request, "/sign-in"), 303);

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
