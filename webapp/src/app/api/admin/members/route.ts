import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readSessionClaims, SESSION_COOKIE_NAME } from "@/lib/admin-auth";
import { buildAbsoluteUrlFromRequest } from "@/lib/request-url";
import { createMemberUser } from "@/lib/users";

type CreateMemberBody = {
  username?: string;
  email?: string;
  password?: string;
};

function isAdmin(token?: string) {
  const claims = readSessionClaims(token);
  return !!claims && claims.role === "Admin";
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!isAdmin(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  const expectsRedirect =
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data");

  let body: CreateMemberBody;
  if (expectsRedirect) {
    const formData = await request.formData();
    body = {
      username: typeof formData.get("username") === "string" ? String(formData.get("username")) : undefined,
      email: typeof formData.get("email") === "string" ? String(formData.get("email")) : undefined,
      password: typeof formData.get("password") === "string" ? String(formData.get("password")) : undefined,
    };
  } else {
    body = (await request.json()) as CreateMemberBody;
  }

  try {
    const user = await createMemberUser({
      username: body.username ?? "",
      email: body.email ?? "",
      password: body.password ?? "",
    });

    if (expectsRedirect) {
      const redirectUrl = buildAbsoluteUrlFromRequest(request, "/admin");
      redirectUrl.searchParams.set("success", `Created member ${user.username}.`);
      return NextResponse.redirect(redirectUrl, 303);
    }

    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Unable to create member.";

    if (expectsRedirect) {
      const redirectUrl = buildAbsoluteUrlFromRequest(request, "/admin");
      redirectUrl.searchParams.set("error", messageText);
      return NextResponse.redirect(redirectUrl, 303);
    }

    return NextResponse.json({ error: messageText }, { status: 400 });
  }
}
