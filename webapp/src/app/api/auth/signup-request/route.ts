import { NextResponse } from "next/server";
import { createSignupRequest } from "@/lib/users";

type SignupRequestBody = {
  username?: string;
  email?: string;
  password?: string;
  message?: string;
};

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const expectsRedirect =
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data");

  let username: string | undefined;
  let email: string | undefined;
  let password: string | undefined;
  let message: string | undefined;

  if (expectsRedirect) {
    const formData = await request.formData();
    const rawUsername = formData.get("username");
    const rawEmail = formData.get("email");
    const rawPassword = formData.get("password");
    const rawMessage = formData.get("message");

    username = typeof rawUsername === "string" ? rawUsername.trim() : undefined;
    email = typeof rawEmail === "string" ? rawEmail.trim() : undefined;
    password = typeof rawPassword === "string" ? rawPassword : undefined;
    message = typeof rawMessage === "string" ? rawMessage.trim() : undefined;
  } else {
    const body = (await request.json()) as SignupRequestBody;
    username = body.username?.trim();
    email = body.email?.trim();
    password = body.password;
    message = body.message?.trim();
  }

  try {
    const signupRequest = createSignupRequest({
      username: username ?? "",
      email: email ?? "",
      password: password ?? "",
      message,
    });

    if (!expectsRedirect) {
      return NextResponse.json({ ok: true, signupRequest }, { status: 201 });
    }

    const successUrl = new URL("/sign-up", request.url);
    successUrl.searchParams.set("success", "Request submitted. An admin will review it soon.");
    return NextResponse.redirect(successUrl, 303);
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Unable to submit signup request.";

    if (!expectsRedirect) {
      return NextResponse.json({ error: messageText }, { status: 400 });
    }

    const errorUrl = new URL("/sign-up", request.url);
    errorUrl.searchParams.set("error", messageText);
    return NextResponse.redirect(errorUrl, 303);
  }
}
