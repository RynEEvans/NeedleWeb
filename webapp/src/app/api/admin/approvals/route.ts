import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readSessionClaims, SESSION_COOKIE_NAME } from "@/lib/admin-auth";
import { buildAbsoluteUrlFromRequest } from "@/lib/request-url";
import {
  approveSignupRequest,
  getPublicSignupRequests,
  rejectSignupRequest,
} from "@/lib/users";

type ApprovalActionBody = {
  requestId?: number;
  action?: "approve" | "reject";
};

function isAdmin(token?: string) {
  const claims = readSessionClaims(token);
  return !!claims && claims.role === "Admin";
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!isAdmin(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requests = await getPublicSignupRequests();
  return NextResponse.json({ requests });
}

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const claims = readSessionClaims(token);

  if (!claims || claims.role !== "Admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as ApprovalActionBody;
  const requestId = Number(body.requestId);

  if (!Number.isFinite(requestId)) {
    return NextResponse.json({ error: "A valid requestId is required." }, { status: 400 });
  }

  if (body.action !== "approve" && body.action !== "reject") {
    return NextResponse.json({ error: "Action must be approve or reject." }, { status: 400 });
  }

  try {
    if (body.action === "approve") {
      const user = await approveSignupRequest(requestId, claims.username);
      return NextResponse.json({ ok: true, user });
    }

    const requestRecord = await rejectSignupRequest(requestId, claims.username);
    return NextResponse.json({ ok: true, request: requestRecord });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Unable to process approval.";
    return NextResponse.json({ error: messageText }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const claims = readSessionClaims(token);

  if (!claims || claims.role !== "Admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const rawRequestId = formData.get("requestId");
  const rawAction = formData.get("action");

  const requestId = Number(rawRequestId);
  const action = typeof rawAction === "string" ? rawAction : "";

  if (!Number.isFinite(requestId)) {
    const redirectUrl = buildAbsoluteUrlFromRequest(request, "/admin");
    redirectUrl.searchParams.set("error", "A valid requestId is required.");
    return NextResponse.redirect(redirectUrl, 303);
  }

  if (action !== "approve" && action !== "reject") {
    const redirectUrl = buildAbsoluteUrlFromRequest(request, "/admin");
    redirectUrl.searchParams.set("error", "Action must be approve or reject.");
    return NextResponse.redirect(redirectUrl, 303);
  }

  try {
    if (action === "approve") {
      const user = await approveSignupRequest(requestId, claims.username);
      const redirectUrl = buildAbsoluteUrlFromRequest(request, "/admin");
      redirectUrl.searchParams.set("success", `Approved ${user.username}.`);
      return NextResponse.redirect(redirectUrl, 303);
    }

    const rejected = await rejectSignupRequest(requestId, claims.username);
    const redirectUrl = buildAbsoluteUrlFromRequest(request, "/admin");
    redirectUrl.searchParams.set("success", `Rejected request from ${rejected.username}.`);
    return NextResponse.redirect(redirectUrl, 303);
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Unable to process approval.";
    const redirectUrl = buildAbsoluteUrlFromRequest(request, "/admin");
    redirectUrl.searchParams.set("error", messageText);
    return NextResponse.redirect(redirectUrl, 303);
  }
}
