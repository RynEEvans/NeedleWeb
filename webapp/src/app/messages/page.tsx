import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSessionClaims, SESSION_COOKIE_NAME } from "@/lib/admin-auth";
import MessagesClient from "./messages-client";

export default async function MessagesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const claims = readSessionClaims(token);

  if (!claims || (claims.role !== "Admin" && claims.role !== "Member")) {
    redirect("/sign-in");
  }

  const initialWithUsername = "__group__";

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="rounded-[1.5rem] border border-white/70 bg-[rgba(255,255,255,0.86)] p-5 shadow-[0_20px_50px_rgba(15,23,42,0.12)] backdrop-blur-md">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-900">Messages</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Player and Admin Messaging</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Use this inbox to chat between game admins and players.
          </p>
        </header>

        <MessagesClient
          role={claims.role}
          username={claims.username}
          initialWithUsername={initialWithUsername}
        />
      </div>
    </main>
  );
}
