import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readSessionClaims, SESSION_COOKIE_NAME } from "@/lib/admin-auth";
import { getMessagingParticipants } from "@/lib/messages";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const claims = readSessionClaims(token);

  if (!claims || (claims.role !== "Admin" && claims.role !== "Member")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const participants = await getMessagingParticipants(claims.username);
    return NextResponse.json({ participants });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load participants.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
