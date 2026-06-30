"use client";

import { useEffect, useState } from "react";

const SOUND_PREF_KEY = "needleweb.messageSoundEnabled";

export default function SoundToggleSetting() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(SOUND_PREF_KEY);
      if (storedValue === "false") {
        setEnabled(false);
      }
    } catch {
      // Keep default if localStorage is unavailable.
    }
  }, []);

  function onToggle() {
    setEnabled((current) => {
      const nextValue = !current;
      try {
        window.localStorage.setItem(SOUND_PREF_KEY, String(nextValue));
      } catch {
        // Ignore localStorage failures.
      }
      return nextValue;
    });
  }

  return (
    <div className="rounded-2xl border border-slate-900/15 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.1)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-900">Message Notification Sound</p>
          <p className="mt-1 text-sm text-slate-600">Play a short tone when new messages arrive.</p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={enabled}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] ${enabled ? "border-blue-800 bg-blue-50 text-blue-900" : "border-slate-300 bg-white text-slate-700"}`}
        >
          {enabled ? "On" : "Off"}
        </button>
      </div>
    </div>
  );
}
