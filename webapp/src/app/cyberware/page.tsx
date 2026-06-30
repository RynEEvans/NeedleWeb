import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSessionClaims, SESSION_COOKIE_NAME } from "@/lib/admin-auth";
import { CYBERWARE_CATALOG } from "@/lib/cyberware-data";

function isFoundationalCyberware(description: string): boolean {
  return /Has\s+\d+\s+Option\s+Slots?/i.test(description);
}

export default async function CyberwarePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const claims = readSessionClaims(token);

  if (!claims) {
    redirect("/sign-in");
  }

  const cyberwareByType = CYBERWARE_CATALOG.reduce<Record<string, typeof CYBERWARE_CATALOG>>((acc, entry) => {
    const type = entry.type.trim() || "Other";
    if (!acc[type]) {
      acc[type] = [];
    }

    acc[type].push(entry);
    return acc;
  }, {});

  const typeSections = Object.entries(cyberwareByType).sort(([typeA], [typeB]) =>
    typeA.localeCompare(typeB),
  );

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="rounded-[1.5rem] border border-white/70 bg-[rgba(255,255,255,0.86)] p-5 shadow-[0_20px_50px_rgba(15,23,42,0.12)] backdrop-blur-md">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-900">Cyberware</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Cyberware Catalog</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Full reference list of all cyberware options from the game catalog.
          </p>
        </header>

        <section className="space-y-6">
          {typeSections.map(([type, entries]) => (
            <article key={type} className="space-y-3">
              <div className="rounded-xl border border-slate-900/10 bg-slate-100 px-4 py-2">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-900">{type}</h2>
              </div>

              <div className="space-y-3 md:hidden">
                {entries.map((entry) => {
                  const isFoundational = isFoundationalCyberware(entry.descriptionData);
                  return (
                    <article
                      key={entry.name}
                      className={`rounded-xl border p-3 ${isFoundational ? "border-slate-900/25 bg-slate-300/55" : "border-slate-900/15 bg-white"}`}
                    >
                      <h3 className="text-sm font-semibold text-slate-950">{entry.name}</h3>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-700">
                        <p>
                          <span className="font-semibold">Cost:</span> {entry.cost}
                        </p>
                        <p>
                          <span className="font-semibold">Slots:</span> {entry.optionSlots}
                        </p>
                        <p>
                          <span className="font-semibold">HL:</span> {entry.hl}
                        </p>
                        <p>
                          <span className="font-semibold">Install:</span> {entry.install}
                        </p>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-700">{entry.descriptionData}</p>
                    </article>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <div className="min-w-[58rem] overflow-hidden rounded-xl border border-slate-900/15 bg-white">
                  <div className="grid grid-cols-[1.35fr_0.7fr_0.6fr_0.6fr_2fr] gap-2 border-b border-slate-900/10 bg-slate-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                    <span>Name</span>
                    <span>Cost</span>
                    <span>Slots</span>
                    <span>HL</span>
                    <span>Description</span>
                  </div>
                  <div className="max-h-[36rem] overflow-y-auto">
                    {entries.map((entry) => {
                      const isFoundational = isFoundationalCyberware(entry.descriptionData);
                      return (
                        <div
                          key={entry.name}
                          className={`grid grid-cols-[1.35fr_0.7fr_0.6fr_0.6fr_2fr] gap-2 border-b border-slate-900/10 px-3 py-2 text-xs text-slate-700 last:border-b-0 ${isFoundational ? "bg-slate-300/55" : "bg-white"}`}
                        >
                          <p className="font-semibold text-slate-900">{entry.name}</p>
                          <p>{entry.cost}</p>
                          <p>{entry.optionSlots}</p>
                          <p>{entry.hl}</p>
                          <p className="leading-5">{entry.descriptionData}</p>
                        </div>
                      );
                    })}
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
