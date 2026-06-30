import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readSessionClaims, SESSION_COOKIE_NAME } from "@/lib/admin-auth";
import { CharacterSheet } from "@/lib/character-sheet";
import { getPublicUserByUsername, updateMemberSheetByUsername } from "@/lib/users";

type ProfileUpdateBody = {
  email?: string;
  status?: "Active" | "Inactive";
  sheet?: CharacterSheet;
};

function getMemberClaimsToken(cookieValue?: string) {
  const claims = readSessionClaims(cookieValue);
  if (!claims || claims.role !== "Member") {
    return null;
  }

  return claims;
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const claims = getMemberClaimsToken(token);

  if (!claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = getPublicUserByUsername(claims.username);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const claims = getMemberClaimsToken(token);

  if (!claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as ProfileUpdateBody;
  const email = body.email?.trim();
  const status = body.status;
  const sheet = body.sheet;

  if (!email && !status && !sheet) {
    return NextResponse.json({ error: "No updates provided." }, { status: 400 });
  }

  if (email) {
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isValidEmail) {
      return NextResponse.json({ error: "Invalid email format." }, { status: 400 });
    }
  }

  if (status && status !== "Active" && status !== "Inactive") {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const updatedUser = updateMemberSheetByUsername(claims.username, {
    email,
    status,
    sheet,
  });

  if (!updatedUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user: updatedUser });
}
