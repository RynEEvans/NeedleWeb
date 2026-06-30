import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSessionClaims, SESSION_COOKIE_NAME } from "@/lib/admin-auth";
import skillsCatalog from "@/lib/skills.json";

type SkillEntry = {
  name: string;
  stat: string;
  multiplier: number;
};

type SkillSection = {
  title: string;
  skills: SkillEntry[];
};

type SkillsCatalog = {
  source: string;
  sections: SkillSection[];
};

const catalog = skillsCatalog as SkillsCatalog;

function formatMultiplier(multiplier: number) {
  if (multiplier <= 1) {
    return "x1";
  }

  return `x${multiplier}`;
}

export default async function SkillsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const claims = readSessionClaims(token);

  if (!claims) {
    redirect("/sign-in");
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="rounded-[1.5rem] border border-white/70 bg-[rgba(255,255,255,0.86)] p-5 shadow-[0_20px_50px_rgba(15,23,42,0.12)] backdrop-blur-md">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-900">Skills</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Skills Reference</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Full reference list of character skills from {catalog.source}.
          </p>
        </header>

        <section className="space-y-6">
          {catalog.sections.map((section) => (
            <article key={section.title} className="space-y-3">
              <div className="rounded-xl border border-slate-900/10 bg-slate-100 px-4 py-2">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-900">
                  {section.title}
                </h2>
              </div>

              <div className="space-y-3 md:hidden">
                {section.skills.map((skill) => (
                  <article key={skill.name} className="rounded-xl border border-slate-900/15 bg-white p-3">
                    <h3 className="text-sm font-semibold text-slate-950">{skill.name}</h3>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-700">
                      <p>
                        <span className="font-semibold">Stat:</span> {skill.stat}
                      </p>
                      <p>
                        <span className="font-semibold">Multiplier:</span> {formatMultiplier(skill.multiplier)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <div className="min-w-[42rem] overflow-hidden rounded-xl border border-slate-900/15 bg-white">
                  <div className="grid grid-cols-[1.7fr_0.5fr_0.7fr] gap-2 border-b border-slate-900/10 bg-slate-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                    <span>Skill</span>
                    <span>Stat</span>
                    <span>Multiplier</span>
                  </div>
                  <div className="max-h-[36rem] overflow-y-auto">
                    {section.skills.map((skill) => (
                      <div
                        key={skill.name}
                        className="grid grid-cols-[1.7fr_0.5fr_0.7fr] gap-2 border-b border-slate-900/10 bg-white px-3 py-2 text-xs text-slate-700 last:border-b-0"
                      >
                        <p className="font-semibold text-slate-900">{skill.name}</p>
                        <p>{skill.stat}</p>
                        <p>{formatMultiplier(skill.multiplier)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
