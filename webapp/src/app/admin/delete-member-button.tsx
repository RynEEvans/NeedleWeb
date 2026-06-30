"use client";

import { useState } from "react";

type DeleteMemberButtonProps = {
  username: string;
};

export default function DeleteMemberButton({ username }: DeleteMemberButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmationUsername, setConfirmationUsername] = useState("");

  const isMatch = confirmationUsername === username;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setConfirmationUsername("");
          setIsOpen(true);
        }}
        className="rounded-full border border-red-900/15 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
      >
        Delete
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]"
            aria-label="Close deletion confirmation"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/50 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
            <p className="text-sm uppercase tracking-[0.25em] text-red-700">Delete member</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">Confirm destructive action</h3>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              This permanently removes <span className="font-semibold text-slate-900">{username}</span>.
              To continue, type the exact username below.
            </p>

            <input
              value={confirmationUsername}
              onChange={(event) => setConfirmationUsername(event.target.value)}
              placeholder={username}
              className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none transition focus:border-red-600"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <form action={`/api/admin/users/${encodeURIComponent(username)}/delete`} method="post">
                <input type="hidden" name="confirmationUsername" value={confirmationUsername} />
                <button
                  type="submit"
                  disabled={!isMatch}
                  className="rounded-xl bg-red-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-300"
                >
                  Delete member
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
