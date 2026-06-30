"use client";

import { useState } from "react";
import MemberProfileForm from "@/app/member/member-profile-form";
import type { PublicUser } from "@/lib/users";

type Props = {
  users: PublicUser[];
};

export default function PlayerSheetsPanel({ users }: Props) {
  const playerUsers = users.filter((user) => user.role !== "Admin");
  const [showPanel, setShowPanel] = useState(true);
  const [selectedUsername, setSelectedUsername] = useState(
    playerUsers.find((user) => user.username === "jordanlee")?.username ??
      playerUsers[0]?.username ??
      "",
  );

  const selectedUser =
    playerUsers.find((user) => user.username === selectedUsername) ??
    playerUsers[0] ??
    null;

  if (playerUsers.length === 0) {
    return (
      <aside className="rounded-[2rem] border border-white/70 bg-[rgba(255,255,255,0.82)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm uppercase tracking-[0.3em] text-blue-900">Player sheets</p>
          <button
            type="button"
            onClick={() => setShowPanel((current) => !current)}
            className="rounded-full border border-slate-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 hover:bg-slate-100"
          >
            {showPanel ? "Hide" : "Show"}
          </button>
        </div>
        {showPanel ? (
          <>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">No player sheets found</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Add a member or guest account to begin editing player character sheets.
        </p>
          </>
        ) : null}
      </aside>
    );
  }

  return (
    <aside className="space-y-6 rounded-[2rem] border border-white/70 bg-[rgba(255,255,255,0.82)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-blue-900">Player sheets</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            View and edit one player sheet at a time
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Use the menu to switch between players. Each sheet saves to that member immediately.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowPanel((current) => !current)}
          className="rounded-full border border-slate-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 hover:bg-slate-100"
        >
          {showPanel ? "Hide" : "Show"}
        </button>
      </div>

      {showPanel ? (
        <>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Select player</span>
            <select
              value={selectedUser?.username ?? ""}
              onChange={(event) => setSelectedUsername(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none transition focus:border-blue-700"
            >
              {playerUsers.map((user) => (
                <option key={user.username} value={user.username}>
                  {user.username} - {user.role}
                </option>
              ))}
            </select>
          </label>

          {selectedUser ? (
            <div className="rounded-[1.75rem] border border-slate-900/8 bg-white/80 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Username</p>
                  <p className="mt-1 font-medium text-slate-950">{selectedUser.username}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Email</p>
                  <p className="mt-1 font-medium text-slate-950">{selectedUser.email}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Status</p>
                  <p className="mt-1 font-medium text-slate-950">{selectedUser.status}</p>
                </div>
              </div>

              <MemberProfileForm
                key={selectedUser.username}
                initialUser={selectedUser}
                saveEndpoint={`/api/admin/users/${selectedUser.username}`}
                title={`Character sheet: ${selectedUser.username}`}
                subtitle="Edit one player sheet at a time from the GM console."
                submitLabel="Save player sheet"
                canEdit={true}
                canEditReadOnlyFields={true}
              />
            </div>
          ) : null}
        </>
      ) : null}
    </aside>
  );
}
