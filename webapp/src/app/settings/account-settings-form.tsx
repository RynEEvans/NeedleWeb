"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AccountSettingsForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) {
      return;
    }

    setError(null);
    setSuccess(null);

    if (!currentPassword.trim()) {
      setError("Current password is required.");
      return;
    }

    if (!newUsername.trim() && !newPassword.trim()) {
      setError("Enter a new username or new password.");
      return;
    }

    if (newPassword.trim() && newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/account/credentials", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newUsername: newUsername.trim() || undefined,
          newPassword: newPassword.trim() || undefined,
        }),
      });

      const data = (await response.json()) as {
        user?: { username: string };
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update account.");
      }

      setSuccess(
        data.user?.username
          ? `Account updated. Signed in as ${data.user.username}.`
          : "Account updated.",
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to update account.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-slate-900/15 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.1)]"
    >
      <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-900">Account</h2>
      <p className="mt-1 text-sm text-slate-600">Change your username and password.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
            Current Password
          </span>
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className="w-full rounded-md border border-slate-900 px-3 py-2 text-sm outline-none focus:border-blue-700"
            required
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
            New Username
          </span>
          <input
            type="text"
            value={newUsername}
            onChange={(event) => setNewUsername(event.target.value)}
            className="w-full rounded-md border border-slate-900 px-3 py-2 text-sm outline-none focus:border-blue-700"
            placeholder="Leave blank to keep current"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
            New Password
          </span>
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="w-full rounded-md border border-slate-900 px-3 py-2 text-sm outline-none focus:border-blue-700"
            placeholder="Leave blank to keep current"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
            Confirm New Password
          </span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="w-full rounded-md border border-slate-900 px-3 py-2 text-sm outline-none focus:border-blue-700"
            placeholder="Repeat new password"
          />
        </label>
      </div>

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {success ? <p className="mt-3 text-sm text-blue-800">{success}</p> : null}

      <div className="mt-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md border border-blue-900 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {saving ? "Saving..." : "Update Account"}
        </button>
      </div>
    </form>
  );
}
