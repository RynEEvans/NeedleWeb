const metrics = [
  { label: "Active users", value: "8" },
  { label: "Admin role", value: "1" },
  { label: "Average requests", value: "Low" },
];

const features = [
  {
    title: "Simple access control",
    description:
      "Separate the admin console from the user experience without adding a heavy permissions system.",
  },
  {
    title: "Fast day-to-day workflow",
    description:
      "Keep the interface small and direct so the app stays easy to maintain for a tiny user base.",
  },
  {
    title: "Room to grow",
    description:
      "Start with static screens and plug in auth, data, and notifications when the app needs them.",
  },
];

export default function Home() {
  return (
    <main className="relative flex min-h-screen overflow-hidden px-6 py-8 text-slate-950 sm:px-10 lg:px-12">
      <div className="absolute inset-0 -z-10 opacity-80">
        <div className="absolute left-[-8rem] top-[-6rem] h-72 w-72 rounded-full bg-teal-200/55 blur-3xl" />
        <div className="absolute right-[-5rem] top-24 h-80 w-80 rounded-full bg-amber-200/50 blur-3xl" />
        <div className="absolute inset-x-0 bottom-[-8rem] h-80 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.75),transparent_68%)]" />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex items-center justify-between rounded-full border border-white/60 bg-[var(--surface)] px-5 py-3 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-teal-800">
              NeedleWeb
            </p>
            <p className="text-sm text-[var(--muted)]">
              Small-team webapp starter with one admin lane.
            </p>
          </div>
          <a
            href="/admin"
            className="rounded-full border border-teal-900/10 bg-teal-950 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-teal-900"
          >
            Open admin
          </a>
        </header>

        <section className="grid flex-1 items-center gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">
          <div className="space-y-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-teal-900/10 bg-white/70 px-4 py-2 text-sm font-medium text-teal-900 shadow-sm backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-teal-600" />
              Built for a tiny, controlled user base
            </span>

            <div className="space-y-4">
              <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
                A calm app surface for a small team and one admi.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-[var(--muted)] sm:text-xl">
                This starter keeps the product shape simple: a user-facing entry
                point, a separate admin console, and a foundation that can grow
                into authentication, roles, and a database when you need it.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/admin"
                className="rounded-full bg-teal-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-950/15 transition hover:-translate-y-0.5 hover:bg-teal-900"
              >
                View admin dashboard
              </a>
              <a
                href="#features"
                className="rounded-full border border-slate-900/10 bg-white/75 px-5 py-3 text-sm font-semibold text-slate-900 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white"
              >
                See app structure
              </a>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-3xl border border-white/70 bg-[var(--surface-strong)] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
                >
                  <p className="text-sm text-[var(--muted)]">{metric.label}</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight">
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-[2rem] border border-white/70 bg-[rgba(255,255,255,0.82)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur-md">
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-teal-800">
                    Admin snapshot
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">
                    Control room for one admin
                  </h2>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                  Ready for auth
                </span>
              </div>

              <div className="space-y-3 rounded-3xl bg-slate-950 p-5 text-slate-50">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>User requests</span>
                  <span>3 open</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800">
                  <div className="h-2 w-3/4 rounded-full bg-teal-400" />
                </div>
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-2xl bg-white/6 p-4">
                    <p className="text-slate-400">Pending approvals</p>
                    <p className="mt-2 text-2xl font-semibold">2</p>
                  </div>
                  <div className="rounded-2xl bg-white/6 p-4">
                    <p className="text-slate-400">Last activity</p>
                    <p className="mt-2 text-2xl font-semibold">5m ago</p>
                  </div>
                </div>
              </div>

              <div id="features" className="space-y-3">
                {features.map((feature) => (
                  <div
                    key={feature.title}
                    className="rounded-2xl border border-slate-900/8 bg-white/70 p-4"
                  >
                    <h3 className="font-semibold text-slate-950">{feature.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
