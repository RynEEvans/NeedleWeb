import Link from "next/link";

type SignUpPageProps = {
  searchParams?: Promise<{ error?: string | string[]; success?: string | string[] }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rawError = resolvedSearchParams?.error;
  const rawSuccess = resolvedSearchParams?.success;

  const error = Array.isArray(rawError) ? rawError[0] : rawError;
  const success = Array.isArray(rawSuccess) ? rawSuccess[0] : rawSuccess;

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10 lg:px-12">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-lg items-center">
        <section className="w-full rounded-[2rem] border border-white/70 bg-[rgba(255,255,255,0.84)] p-8 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur-md">
          <div className="mb-4">
            <Link
              href="/"
              className="inline-flex rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-700 transition hover:bg-slate-50"
            >
              Back
            </Link>
          </div>

          <p className="text-sm uppercase tracking-[0.3em] text-blue-900">New recruit</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Request sign up</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Submit a request to join as a player. A Game Master will review and approve your account.
          </p>

          <form className="mt-6 space-y-4" action="/api/auth/signup-request" method="post">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Username</span>
              <input
                type="text"
                name="username"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none transition focus:border-blue-700"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                name="email"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none transition focus:border-blue-700"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
              <input
                type="password"
                name="password"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none transition focus:border-blue-700"
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Message (optional)</span>
              <textarea
                name="message"
                rows={4}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none transition focus:border-blue-700"
                placeholder="Tell the Game Master who you are and what campaign you're joining."
              />
            </label>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {success ? <p className="text-sm text-green-700">{success}</p> : null}

            <button
              type="submit"
              className="w-full rounded-xl bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Submit request
            </button>
          </form>

          <p className="mt-6 text-sm text-[var(--muted)]">
            Already have access?{" "}
            <Link href="/sign-in" className="font-semibold text-blue-800 hover:text-blue-700">
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
