import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readSessionClaims, SESSION_COOKIE_NAME } from "@/lib/admin-auth";
import { CharacterSheet } from "@/lib/character-sheet";
import { findUserByUsername, updateMemberSheetByUsername } from "@/lib/users";

type SheetUpdateBody = {
  sheet?: CharacterSheet;
};

function getAdminClaimsToken(cookieValue?: string) {
  const claims = readSessionClaims(cookieValue);
  if (!claims || claims.role !== "Admin") {
    return null;
  }

  return claims;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const claims = getAdminClaimsToken(token);

  if (!claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { username } = await params;
    const targetUser = await findUserByUsername(username);
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (targetUser.role === "Admin") {
      return NextResponse.json(
        { error: "Admin accounts cannot be edited here." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as SheetUpdateBody;
    if (!body.sheet) {
      return NextResponse.json({ error: "Sheet is required." }, { status: 400 });
    }

    const updatedUser = await updateMemberSheetByUsername(username, { sheet: body.sheet });
    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update user sheet.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
