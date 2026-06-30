import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { readSessionClaims, SESSION_COOKIE_NAME } from "@/lib/admin-auth";
import { getPublicUsers } from "@/lib/users";
import PlayerSheetsPanel from "./player-sheets-panel";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const claims = readSessionClaims(token);

  if (!claims || claims.role !== "Admin") {
    redirect("/sign-in");
  }

  const users = getPublicUsers();

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10 lg:px-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-full border border-white/60 bg-[var(--surface)] px-5 py-3 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-teal-800">
              Game Master console
            </p>
            <p className="text-sm text-[var(--muted)]">
              Run your campaign from one dedicated place.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-full border border-slate-900/10 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:bg-white"
            >
              Back to home
            </Link>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="rounded-full border border-red-900/10 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:-translate-y-0.5 hover:bg-red-100"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-white/70 bg-[rgba(255,255,255,0.82)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur-md">
            <div className="mb-6">
              <p className="text-sm uppercase tracking-[0.3em] text-teal-800">
                Player access
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                Players
              </h2>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-900/8 bg-white/85">
              <div className="grid grid-cols-[1.4fr_1.8fr_0.8fr_0.8fr] border-b border-slate-900/8 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700">
                <span>Username</span>
                <span>Email</span>
                <span>Role</span>
                <span>Status</span>
              </div>
              {users.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-[var(--muted)]">
                  No users found
                </div>
              ) : (
                users.map((user) => (
                  <div
                    key={user.id}
                    className="grid grid-cols-[1.4fr_1.8fr_0.8fr_0.8fr] items-center border-b border-slate-900/6 px-5 py-4 last:border-b-0"
                  >
                    <span className="font-medium text-slate-950">{user.username}</span>
                    <span className="text-sm text-[var(--muted)]">{user.email}</span>
                    <span className="text-sm text-[var(--muted)]">{user.role}</span>
                    <span className="text-sm text-[var(--muted)]">{user.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <PlayerSheetsPanel users={users} />
        </section>
      </div>
    </main>
  );
}