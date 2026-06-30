"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function GlobalAuthMenu() {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    if (signingOut) {
      return;
    }

    setSigningOut(true);
    setOpen(false);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error("Sign out failed.");
      }
    } finally {
      router.push("/sign-in");
      router.refresh();
      setSigningOut(false);
    }
  }

  return (
    <div className="fixed left-4 top-4 z-50">
      <button
        type="button"
        aria-label="Toggle navigation menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-900/20 bg-white/95 shadow-[0_10px_30px_rgba(15,23,42,0.2)] backdrop-blur"
      >
        <span className="sr-only">Menu</span>
        <span className="flex flex-col gap-1.5">
          <span className="block h-0.5 w-5 bg-slate-900" />
          <span className="block h-0.5 w-5 bg-slate-900" />
          <span className="block h-0.5 w-5 bg-slate-900" />
        </span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close menu overlay"
            onClick={() => setOpen(false)}
            className="fixed inset-0 -z-10 bg-black/20"
          />
          <nav className="mt-2 w-52 rounded-2xl border border-slate-900/15 bg-white p-2 shadow-[0_20px_50px_rgba(15,23,42,0.22)]">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Home
            </Link>
            <Link
              href="/member"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Character Sheet
            </Link>
            <Link
              href="/cyberware"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Cyberware
            </Link>
            <Link
              href="/skills"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Skills
            </Link>
            <Link
              href="/weapons"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Weapons
            </Link>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Settings
            </Link>

            <div className="my-1 h-px bg-slate-200" />
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          </nav>
        </>
      ) : null}
    </div>
  );
}
