import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { readSessionClaims, SESSION_COOKIE_NAME } from "@/lib/admin-auth";
import { deleteMessageById, editMessageById } from "@/lib/messages";

type EditMessageBody = {
  body?: string;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getMessageId(rawId: string): number | null {
  const parsedId = Number.parseInt(rawId, 10);
  if (!Number.isFinite(parsedId) || parsedId <= 0) {
    return null;
  }

  return parsedId;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const claims = readSessionClaims(token);

  if (!claims || (claims.role !== "Admin" && claims.role !== "Member")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  const messageId = getMessageId(params.id);
  if (!messageId) {
    return NextResponse.json({ error: "Invalid message id." }, { status: 400 });
  }

  const body = (await request.json()) as EditMessageBody;
  const messageBody = body.body?.trim() ?? "";
  if (!messageBody) {
    return NextResponse.json({ error: "Message body is required." }, { status: 400 });
  }

  try {
    const message = await editMessageById({
      messageId,
      senderUsername: claims.username,
      body: messageBody,
    });

    return NextResponse.json({ message });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to edit message.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const claims = readSessionClaims(token);

  if (!claims || (claims.role !== "Admin" && claims.role !== "Member")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  const messageId = getMessageId(params.id);
  if (!messageId) {
    return NextResponse.json({ error: "Invalid message id." }, { status: 400 });
  }

  try {
    await deleteMessageById({
      messageId,
      senderUsername: claims.username,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete message.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
