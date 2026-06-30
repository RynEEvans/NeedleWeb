const features = [
  {
    title: "You are a NEEDLE!",
    description:
      "A NEEDLE is a member of the WEAVER Guild who were recruited with the task of repairing the Universal Thread.",
  },
  {
    title: "What is Your Mission?",
    description:
      "Your mission is to repair rips in the Universal Thread with a STITCHER, but a NEEDLE wouldn't be needed if it was that easy.",
  },
  {
    title: "NEEDLES TTRPG",
    description:
      "NEEDLES TTRPG is a Frankensteined TTRPG from some of the TTRPGs I read and liked. It's built for the original mission, and dungeon crawler style playing instead of long campaigns.",
  },
];

export default function Home() {
  return (
    <main className="relative flex min-h-screen overflow-hidden px-6 py-8 text-slate-950 sm:px-10 lg:px-12">
      <div className="absolute inset-0 -z-10 opacity-80">
        <div className="absolute left-[-8rem] top-[-6rem] h-72 w-72 rounded-full bg-blue-300/50 blur-3xl" />
        <div className="absolute right-[-5rem] top-24 h-80 w-80 rounded-full bg-amber-200/50 blur-3xl" />
        <div className="absolute inset-x-0 bottom-[-8rem] h-80 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.75),transparent_68%)]" />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex items-center justify-between rounded-full border border-white/60 bg-[var(--surface)] px-5 py-3 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-900">
              NEEDLES TTRPG
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/sign-up"
              className="rounded-full border border-blue-900/20 bg-white px-4 py-2 text-sm font-semibold text-blue-900 transition hover:-translate-y-0.5 hover:bg-blue-50"
            >
              Sign up
            </a>
            <a
              href="/sign-in"
              className="rounded-full border border-blue-900/20 bg-blue-800 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 hover:text-white"
            >
              Log in
            </a>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">
          <div className="space-y-6">
            <div className="space-y-4">
              <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
                NEEDLES TTRPG
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-[var(--muted)] sm:text-xl">
                NEEDLES TTRPG is a Frankensteined TTRPG from some of the TTRPGs I read and liked.
              </p>
              <p className="max-w-2xl text-lg leading-8 text-[var(--muted)] sm:text-xl">
                It&apos;s built for the original mission, and dungeon crawler style playing instead of long campaigns.
              </p>
            </div>

          </div>

          <aside className="rounded-[2rem] border border-white/70 bg-[rgba(255,255,255,0.82)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur-md">
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-blue-900">
                    Universal Thread
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">
                    Who are you?
                  </h2>
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