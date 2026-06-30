import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSessionClaims, SESSION_COOKIE_NAME } from "@/lib/admin-auth";
import { getPublicUserByUsername } from "@/lib/users";
import MemberProfileForm from "./member-profile-form";

export default async function MemberPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const claims = readSessionClaims(token);

  if (!claims) {
    redirect("/sign-in");
  }

  if (claims.role === "Admin") {
    redirect("/admin");
  }

  const user = getPublicUserByUsername(claims.username);
  if (!user) {
    redirect("/sign-in");
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[120rem] flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-full border border-white/60 bg-[var(--surface)] px-5 py-3 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-teal-800">
              Player area
            </p>
            <p className="text-sm text-[var(--muted)]">
              Character profile and account details for {user.username}
            </p>
          </div>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="rounded-full border border-red-900/10 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:-translate-y-0.5 hover:bg-red-100"
            >
              Sign out
            </button>
          </form>
        </header>

        <MemberProfileForm initialUser={user} />
      </div>
    </main>
  );
}
