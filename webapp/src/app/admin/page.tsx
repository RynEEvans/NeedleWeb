import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { readSessionClaims, SESSION_COOKIE_NAME } from "@/lib/admin-auth";
import { getPublicSignupRequests, getPublicUsers } from "@/lib/users";
import PlayerSheetsPanel from "./player-sheets-panel";
import DeleteMemberButton from "./delete-member-button";

type AdminPageProps = {
  searchParams?: Promise<{ error?: string | string[]; success?: string | string[] }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const claims = readSessionClaims(token);

  if (!claims || claims.role !== "Admin") {
    redirect("/sign-in");
  }

  const users = getPublicUsers();
  const signupRequests = getPublicSignupRequests();
  const pendingSignupRequests = signupRequests.filter((request) => request.status === "Pending");
  const reviewedSignupRequests = signupRequests
    .filter((request) => request.status !== "Pending")
    .sort((a, b) => {
      const aTime = a.status === "Approved" ? a.approvedAt ?? a.requestedAt : a.rejectedAt ?? a.requestedAt;
      const bTime = b.status === "Approved" ? b.approvedAt ?? b.requestedAt : b.rejectedAt ?? b.requestedAt;
      return bTime.localeCompare(aTime);
    });

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rawError = resolvedSearchParams?.error;
  const rawSuccess = resolvedSearchParams?.success;
  const error = Array.isArray(rawError) ? rawError[0] : rawError;
  const success = Array.isArray(rawSuccess) ? rawSuccess[0] : rawSuccess;

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10 lg:px-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-full border border-white/60 bg-[var(--surface)] px-5 py-3 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <div>
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-900">
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

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}
        {success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-white/70 bg-[rgba(255,255,255,0.82)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur-md">
            <p className="text-sm uppercase tracking-[0.3em] text-blue-900">Approvals</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Signup requests</h2>

            {pendingSignupRequests.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--muted)]">No pending signup requests.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {pendingSignupRequests.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-2xl border border-slate-900/10 bg-white/80 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{request.username}</p>
                        <p className="text-sm text-[var(--muted)]">{request.email}</p>
                        {request.message ? (
                          <p className="mt-2 text-sm text-[var(--muted)]">{request.message}</p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <form action="/api/admin/approvals" method="post">
                          <input type="hidden" name="requestId" value={request.id} />
                          <input type="hidden" name="action" value="approve" />
                          <button
                            type="submit"
                            className="rounded-full border border-emerald-900/15 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                          >
                            Approve
                          </button>
                        </form>
                        <form action="/api/admin/approvals" method="post">
                          <input type="hidden" name="requestId" value={request.id} />
                          <input type="hidden" name="action" value="reject" />
                          <button
                            type="submit"
                            className="rounded-full border border-red-900/15 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                          >
                            Reject
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-[rgba(255,255,255,0.82)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur-md">
            <p className="text-sm uppercase tracking-[0.3em] text-blue-900">Member management</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Create member</h2>

            <form action="/api/admin/members" method="post" className="mt-4 grid gap-3">
              <input
                name="username"
                type="text"
                placeholder="Username"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none transition focus:border-blue-700"
                required
              />
              <input
                name="email"
                type="email"
                placeholder="Email"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none transition focus:border-blue-700"
                required
              />
              <input
                name="password"
                type="password"
                placeholder="Temporary password"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none transition focus:border-blue-700"
                required
              />
              <button
                type="submit"
                className="mt-1 rounded-xl bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Create member
              </button>
            </form>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/70 bg-[rgba(255,255,255,0.82)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur-md">
          <p className="text-sm uppercase tracking-[0.3em] text-blue-900">Approval history</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Reviewed requests</h2>

          {reviewedSignupRequests.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--muted)]">No reviewed signup requests yet.</p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-3xl border border-slate-900/8 bg-white/85">
              <div className="grid grid-cols-[1.1fr_1.4fr_0.9fr_1fr_1.1fr] border-b border-slate-900/8 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700">
                <span>Username</span>
                <span>Email</span>
                <span>Status</span>
                <span>Reviewed by</span>
                <span>Reviewed at</span>
              </div>
              {reviewedSignupRequests.map((request) => {
                const reviewedBy =
                  request.status === "Approved"
                    ? request.approvedBy ?? "Unknown"
                    : request.rejectedBy ?? "Unknown";
                const reviewedAt =
                  request.status === "Approved"
                    ? request.approvedAt ?? request.requestedAt
                    : request.rejectedAt ?? request.requestedAt;

                return (
                  <div
                    key={request.id}
                    className="grid grid-cols-[1.1fr_1.4fr_0.9fr_1fr_1.1fr] items-center border-b border-slate-900/6 px-5 py-4 text-sm last:border-b-0"
                  >
                    <span className="font-medium text-slate-950">{request.username}</span>
                    <span className="text-[var(--muted)]">{request.email}</span>
                    <span className={request.status === "Approved" ? "text-emerald-700" : "text-red-700"}>
                      {request.status}
                    </span>
                    <span className="text-[var(--muted)]">{reviewedBy}</span>
                    <span className="text-[var(--muted)]">{new Date(reviewedAt).toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-white/70 bg-[rgba(255,255,255,0.82)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur-md">
            <div className="mb-6">
                <p className="text-sm uppercase tracking-[0.3em] text-blue-900">
                Player access
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                Players
              </h2>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-900/8 bg-white/85">
              <div className="grid grid-cols-[1.4fr_1.8fr_0.8fr_0.8fr_1fr] border-b border-slate-900/8 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700">
                <span>Username</span>
                <span>Email</span>
                <span>Role</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
              {users.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-[var(--muted)]">
                  No users found
                </div>
              ) : (
                users.map((user) => (
                  <div
                    key={user.id}
                    className="grid grid-cols-[1.4fr_1.8fr_0.8fr_0.8fr_1fr] items-center border-b border-slate-900/6 px-5 py-4 last:border-b-0"
                  >
                    <span className="font-medium text-slate-950">{user.username}</span>
                    <span className="text-sm text-[var(--muted)]">{user.email}</span>
                    <span className="text-sm text-[var(--muted)]">{user.role}</span>
                    <span className="text-sm text-[var(--muted)]">{user.status}</span>
                    <span>
                      {user.role === "Admin" ? (
                        <span className="text-xs text-slate-400">Protected</span>
                      ) : (
                        <DeleteMemberButton username={user.username} />
                      )}
                    </span>
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