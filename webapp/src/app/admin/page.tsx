const users = [
  { name: "Maya Chen", role: "Admin", status: "Online" },
  { name: "Jordan Lee", role: "Member", status: "Active" },
  { name: "Sam Patel", role: "Member", status: "Active" },
  { name: "Riley Brooks", role: "Guest", status: "Invited" },
];

const tasks = [
  "Approve new user access",
  "Review recent activity log",
  "Confirm the next content update",
];

export default function AdminPage() {
  return (
    <main className="min-h-screen px-6 py-8 sm:px-10 lg:px-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-full border border-white/60 bg-[var(--surface)] px-5 py-3 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-teal-800">
              Admin console
            </p>
            <p className="text-sm text-[var(--muted)]">
              Manage the app from one dedicated place.
            </p>
          </div>
          <a
            href="/"
            className="rounded-full border border-slate-900/10 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:bg-white"
          >
            Back to home
          </a>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-white/70 bg-[rgba(255,255,255,0.82)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur-md">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-teal-800">
                  User access
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                  One admin, a small trusted group.
                </h1>
              </div>
              <div className="rounded-2xl bg-teal-950 px-4 py-3 text-white">
                <p className="text-sm text-teal-100">Approval queue</p>
                <p className="text-2xl font-semibold">3</p>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-3xl border border-slate-900/8 bg-white/85">
              <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr] border-b border-slate-900/8 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700">
                <span>Name</span>
                <span>Role</span>
                <span>Status</span>
              </div>
              {users.map((user) => (
                <div
                  key={user.name}
                  className="grid grid-cols-[1.4fr_0.8fr_0.8fr] items-center border-b border-slate-900/6 px-5 py-4 last:border-b-0"
                >
                  <span className="font-medium text-slate-950">{user.name}</span>
                  <span className="text-sm text-[var(--muted)]">{user.role}</span>
                  <span className="text-sm text-[var(--muted)]">{user.status}</span>
                </div>
              ))}
            </div>
          </div>

          <aside className="space-y-6 rounded-[2rem] border border-white/70 bg-[rgba(255,255,255,0.82)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur-md">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-teal-800">
                Focus list
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                What the admin should do next
              </h2>
            </div>

            <div className="space-y-3">
              {tasks.map((task, index) => (
                <div
                  key={task}
                  className="flex items-center gap-4 rounded-2xl border border-slate-900/8 bg-white/80 p-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100 font-semibold text-teal-900">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-6 text-slate-700">{task}</p>
                </div>
              ))}
            </div>

            <div className="rounded-3xl bg-amber-50 p-5 text-amber-950">
              <p className="text-sm font-semibold uppercase tracking-[0.24em]">
                Next step
              </p>
              <p className="mt-2 text-sm leading-6 text-amber-950/80">
                Add authentication and a database once the app shape is stable.
                For a tiny user base, that keeps the first version simple and
                cheap to run.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}