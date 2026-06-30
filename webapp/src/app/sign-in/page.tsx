type SignInPageProps = {
  searchParams?: Promise<{ error?: string | string[] }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rawError = resolvedSearchParams?.error;
  const error = Array.isArray(rawError) ? rawError[0] : rawError;

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10 lg:px-12">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-md items-center">
        <section className="w-full rounded-[2rem] border border-white/70 bg-[rgba(255,255,255,0.84)] p-8 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur-md">
          <p className="text-sm uppercase tracking-[0.3em] text-blue-900">Campaign access</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Sign in</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Sign in as Game Master or Player. Players will be redirected to their own character profile.
          </p>

          <form className="mt-6 space-y-4" action="/api/auth/login" method="post">
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
              <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
              <input
                type="password"
                name="password"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none transition focus:border-blue-700"
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
              />
            </label>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <button
              type="submit"
              className="w-full rounded-xl bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Sign in
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
