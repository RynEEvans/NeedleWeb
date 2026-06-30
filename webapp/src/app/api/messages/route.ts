import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { readSessionClaims, SESSION_COOKIE_NAME } from "@/lib/admin-auth";
import {
  getConversationSummariesForUser,
  getGroupMessages,
  getMessagingParticipants,
  getThreadMessages,
  sendMessage,
  sendGroupMessage,
} from "@/lib/messages";
import { getPublicUserByUsername } from "@/lib/users";

type SendMessageBody = {
  to?: string;
  body?: string;
};

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const claims = readSessionClaims(token);

  if (!claims || (claims.role !== "Admin" && claims.role !== "Member")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const withUsername = request.nextUrl.searchParams.get("with")?.trim();

    if (!withUsername) {
      const [conversations, participants] = await Promise.all([
        getConversationSummariesForUser(claims.username),
        getMessagingParticipants(claims.username),
      ]);

      return NextResponse.json({ conversations, participants });
    }

    if (withUsername === "__group__") {
      const messages = await getGroupMessages("global");
      return NextResponse.json({ messages, withUsername });
    }

    const messages = await getThreadMessages({
      viewerUsername: claims.username,
      withUsername,
    });

    return NextResponse.json({ messages, withUsername });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load messages.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const claims = readSessionClaims(token);

  if (!claims || (claims.role !== "Admin" && claims.role !== "Member")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as SendMessageBody;
  const messageBody = body.body?.trim() ?? "";

  if (!messageBody) {
    return NextResponse.json({ error: "Message body is required." }, { status: 400 });
  }

  try {
    let recipientUsername = body.to?.trim() ?? "";

    if (recipientUsername === "__group__") {
      const message = await sendGroupMessage({
        senderUsername: claims.username,
        body: messageBody,
        groupName: "global",
      });

      return NextResponse.json({ message }, { status: 201 });
    }

    if (!recipientUsername) {
      return NextResponse.json({ error: "Recipient is required." }, { status: 400 });
    }

    if (recipientUsername.toLowerCase() === claims.username.toLowerCase()) {
      return NextResponse.json({ error: "Cannot send a message to yourself." }, { status: 400 });
    }

    const recipientUser = await getPublicUserByUsername(recipientUsername);
    if (!recipientUser) {
      return NextResponse.json({ error: "Recipient not found." }, { status: 404 });
    }

    if (recipientUser.role !== "Admin" && recipientUser.role !== "Member") {
      return NextResponse.json({ error: "Recipient is not eligible for messaging." }, { status: 400 });
    }

    const message = await sendMessage({
      senderUsername: claims.username,
      recipientUsername,
      body: messageBody,
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send message.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
