import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createSessionTokenWithRole,
  getSessionTtlSeconds,
  readSessionClaims,
  SESSION_COOKIE_NAME,
} from "@/lib/admin-auth";
import { updateAccountCredentials } from "@/lib/users";

type UpdateCredentialsBody = {
  currentPassword?: string;
  newUsername?: string;
  newPassword?: string;
};

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const claims = readSessionClaims(token);

  if (!claims || (claims.role !== "Admin" && claims.role !== "Member")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as UpdateCredentialsBody;
  const currentPassword = body.currentPassword?.trim() ?? "";
  const newUsername = body.newUsername?.trim();
  const newPassword = body.newPassword?.trim();

  if (!currentPassword) {
    return NextResponse.json({ error: "Current password is required." }, { status: 400 });
  }

  if (!newUsername && !newPassword) {
    return NextResponse.json({ error: "Provide a new username or password." }, { status: 400 });
  }

  try {
    const updatedUser = await updateAccountCredentials({
      currentUsername: claims.username,
      currentPassword,
      newUsername,
      newPassword,
    });

    const response = NextResponse.json({ user: updatedUser });
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: createSessionTokenWithRole(updatedUser.username, claims.role),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: getSessionTtlSeconds(),
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update account.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
