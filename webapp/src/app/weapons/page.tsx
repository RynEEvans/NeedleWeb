import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSessionClaims, SESSION_COOKIE_NAME } from "@/lib/admin-auth";
import weaponsData from "@/lib/weapons.json";

type MeleeWeapon = {
  weaponType: string;
  examples: string[];
  handsRequired: string;
  damage: string;
  rof: number;
  canBeConcealed: boolean;
  cost: string;
  priceCategory: string;
};

type RangedWeapon = {
  weaponType: string;
  weaponSkill: string;
  singleShotDamage: string;
  standardMagazine: string;
  rof: number;
  handsRequired: number;
  canBeConcealed: boolean;
  cost: string;
  priceCategory: string;
  specialFeatures: string[];
};

type WeaponsCatalog = {
  source: {
    melee: string;
    ranged: string;
  };
  melee: MeleeWeapon[];
  ranged: RangedWeapon[];
};

const catalog = weaponsData as WeaponsCatalog;

function yesNo(value: boolean) {
  return value ? "Yes" : "No";
}

export default async function WeaponsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const claims = readSessionClaims(token);

  if (!claims || (claims.role !== "Admin" && claims.role !== "Member")) {
    redirect("/sign-in");
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="rounded-[1.5rem] border border-white/70 bg-[rgba(255,255,255,0.86)] p-5 shadow-[0_20px_50px_rgba(15,23,42,0.12)] backdrop-blur-md">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-900">Weapons</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Weapons Reference</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Combined melee and ranged reference from {catalog.source.melee} and {catalog.source.ranged}.
          </p>
        </header>

        <section className="space-y-4">
          <div className="rounded-xl border border-slate-900/10 bg-slate-100 px-4 py-2">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-900">Melee Weapons</h2>
          </div>

          <div className="space-y-3 md:hidden">
            {catalog.melee.map((weapon) => (
              <article key={weapon.weaponType} className="rounded-xl border border-slate-900/15 bg-white p-3">
                <h3 className="text-sm font-semibold text-slate-950">{weapon.weaponType}</h3>
                <p className="mt-1 text-xs text-slate-700">Examples: {weapon.examples.join(", ")}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-700">
                  <p><span className="font-semibold">Hands:</span> {weapon.handsRequired}</p>
                  <p><span className="font-semibold">Damage:</span> {weapon.damage}</p>
                  <p><span className="font-semibold">ROF:</span> {weapon.rof}</p>
                  <p><span className="font-semibold">Concealed:</span> {yesNo(weapon.canBeConcealed)}</p>
                  <p><span className="font-semibold">Cost:</span> {weapon.cost}</p>
                  <p><span className="font-semibold">Category:</span> {weapon.priceCategory}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <div className="min-w-[64rem] overflow-hidden rounded-xl border border-slate-900/15 bg-white">
              <div className="grid grid-cols-[1.2fr_2fr_1.2fr_0.8fr_0.8fr_1fr_0.9fr_1fr] gap-2 border-b border-slate-900/10 bg-slate-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                <span>Type</span>
                <span>Examples</span>
                <span>Hands</span>
                <span>Damage</span>
                <span>ROF</span>
                <span>Concealed</span>
                <span>Cost</span>
                <span>Category</span>
              </div>
              <div className="max-h-[34rem] overflow-y-auto">
                {catalog.melee.map((weapon) => (
                  <div key={weapon.weaponType} className="grid grid-cols-[1.2fr_2fr_1.2fr_0.8fr_0.8fr_1fr_0.9fr_1fr] gap-2 border-b border-slate-900/10 px-3 py-2 text-xs text-slate-700 last:border-b-0">
                    <p className="font-semibold text-slate-900">{weapon.weaponType}</p>
                    <p>{weapon.examples.join(", ")}</p>
                    <p>{weapon.handsRequired}</p>
                    <p>{weapon.damage}</p>
                    <p>{weapon.rof}</p>
                    <p>{yesNo(weapon.canBeConcealed)}</p>
                    <p>{weapon.cost}</p>
                    <p>{weapon.priceCategory}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-xl border border-slate-900/10 bg-slate-100 px-4 py-2">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-900">Ranged Weapons</h2>
          </div>

          <div className="space-y-3 md:hidden">
            {catalog.ranged.map((weapon) => (
              <article key={weapon.weaponType} className="rounded-xl border border-slate-900/15 bg-white p-3">
                <h3 className="text-sm font-semibold text-slate-950">{weapon.weaponType}</h3>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-700">
                  <p><span className="font-semibold">Skill:</span> {weapon.weaponSkill}</p>
                  <p><span className="font-semibold">Damage:</span> {weapon.singleShotDamage}</p>
                  <p><span className="font-semibold">Magazine:</span> {weapon.standardMagazine}</p>
                  <p><span className="font-semibold">ROF:</span> {weapon.rof}</p>
                  <p><span className="font-semibold">Hands:</span> {weapon.handsRequired}</p>
                  <p><span className="font-semibold">Concealed:</span> {yesNo(weapon.canBeConcealed)}</p>
                  <p><span className="font-semibold">Cost:</span> {weapon.cost}</p>
                  <p><span className="font-semibold">Category:</span> {weapon.priceCategory}</p>
                </div>
                <p className="mt-2 text-xs text-slate-700">
                  <span className="font-semibold">Features:</span> {weapon.specialFeatures.join(" | ")}
                </p>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <div className="min-w-[76rem] overflow-hidden rounded-xl border border-slate-900/15 bg-white">
              <div className="grid grid-cols-[1.2fr_1fr_0.9fr_1.2fr_0.7fr_0.7fr_0.9fr_0.8fr_1fr_1.4fr] gap-2 border-b border-slate-900/10 bg-slate-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                <span>Type</span>
                <span>Skill</span>
                <span>Damage</span>
                <span>Magazine</span>
                <span>ROF</span>
                <span>Hands</span>
                <span>Concealed</span>
                <span>Cost</span>
                <span>Category</span>
                <span>Features</span>
              </div>
              <div className="max-h-[34rem] overflow-y-auto">
                {catalog.ranged.map((weapon) => (
                  <div key={weapon.weaponType} className="grid grid-cols-[1.2fr_1fr_0.9fr_1.2fr_0.7fr_0.7fr_0.9fr_0.8fr_1fr_1.4fr] gap-2 border-b border-slate-900/10 px-3 py-2 text-xs text-slate-700 last:border-b-0">
                    <p className="font-semibold text-slate-900">{weapon.weaponType}</p>
                    <p>{weapon.weaponSkill}</p>
                    <p>{weapon.singleShotDamage}</p>
                    <p>{weapon.standardMagazine}</p>
                    <p>{weapon.rof}</p>
                    <p>{weapon.handsRequired}</p>
                    <p>{yesNo(weapon.canBeConcealed)}</p>
                    <p>{weapon.cost}</p>
                    <p>{weapon.priceCategory}</p>
                    <p>{weapon.specialFeatures.join(" | ")}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
