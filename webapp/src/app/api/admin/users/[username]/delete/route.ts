import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readSessionClaims, SESSION_COOKIE_NAME } from "@/lib/admin-auth";
import { deleteUserByUsername } from "@/lib/users";

function isAdmin(token?: string) {
  const claims = readSessionClaims(token);
  return !!claims && claims.role === "Admin";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!isAdmin(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { username } = await params;
  const contentType = request.headers.get("content-type") ?? "";
  const expectsRedirect =
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data");

  let confirmationUsername = "";
  if (expectsRedirect) {
    const formData = await request.formData();
    const value = formData.get("confirmationUsername");
    confirmationUsername = typeof value === "string" ? value : "";
  } else {
    const body = (await request.json()) as { confirmationUsername?: string };
    confirmationUsername = body.confirmationUsername ?? "";
  }

  if (confirmationUsername !== username) {
    const message = "Type the exact username to confirm deletion.";
    if (expectsRedirect) {
      const redirectUrl = new URL("/admin", request.url);
      redirectUrl.searchParams.set("error", message);
      return NextResponse.redirect(redirectUrl, 303);
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const deletedUser = await deleteUserByUsername(username);

    if (expectsRedirect) {
      const redirectUrl = new URL("/admin", request.url);
      redirectUrl.searchParams.set("success", `Deleted member ${deletedUser.username}.`);
      return NextResponse.redirect(redirectUrl, 303);
    }

    return NextResponse.json({ ok: true, user: deletedUser });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Unable to delete user.";

    if (expectsRedirect) {
      const redirectUrl = new URL("/admin", request.url);
      redirectUrl.searchParams.set("error", messageText);
      return NextResponse.redirect(redirectUrl, 303);
    }

    return NextResponse.json({ error: messageText }, { status: 400 });
  }
}
