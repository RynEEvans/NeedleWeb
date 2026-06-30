"use client";

import { useState } from "react";

type RollState = {
  die: "d10" | "d6";
  value: number;
};

function roll(sides: number) {
  return Math.floor(Math.random() * sides) + 1;
}

export default function DiceRollerBubble() {
  const [open, setOpen] = useState(false);
  const [lastRoll, setLastRoll] = useState<RollState | null>(null);

  function toggleOpen() {
    setOpen((current) => !current);
  }

  function handleRoll(sides: 10 | 6) {
    const value = roll(sides);
    setLastRoll({ die: sides === 10 ? "d10" : "d6", value });
  }

  return (
    <div
      className="fixed z-50"
      style={{
        right: "max(1rem, env(safe-area-inset-right))",
        bottom: "max(1rem, env(safe-area-inset-bottom))",
      }}
    >
      {open ? (
        <div className="fixed inset-0 z-40 bg-black/20 sm:hidden" onClick={toggleOpen} aria-hidden="true" />
      ) : null}

      {open ? (
        <div className="fixed inset-x-3 z-50 rounded-2xl border border-slate-900/15 bg-white p-4 shadow-[0_20px_45px_rgba(2,6,23,0.28)] sm:hidden" style={{ bottom: "calc(max(1rem, env(safe-area-inset-bottom)) + 4.5rem)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
            Dice Roller
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleRoll(10)}
              className="touch-manipulation rounded-lg border border-slate-900 bg-slate-100 px-2 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 active:scale-[0.98]"
            >
              Roll d10
            </button>
            <button
              type="button"
              onClick={() => handleRoll(6)}
              className="touch-manipulation rounded-lg border border-slate-900 bg-slate-100 px-2 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 active:scale-[0.98]"
            >
              Roll d6
            </button>
          </div>
          <div className="mt-3 rounded-lg border border-teal-800/20 bg-teal-50 px-2 py-2 text-sm">
            {lastRoll ? (
              <p>
                <span className="font-semibold text-teal-800">{lastRoll.die.toUpperCase()}</span>{" "}
                result: <span className="font-bold text-slate-900">{lastRoll.value}</span>
              </p>
            ) : (
              <p className="text-slate-600">Tap a die to roll.</p>
            )}
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="absolute bottom-full right-0 mb-3 hidden w-60 max-w-[80vw] rounded-2xl border border-slate-900/15 bg-white/95 p-3 shadow-[0_16px_40px_rgba(2,6,23,0.25)] backdrop-blur sm:block">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
            Dice Roller
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleRoll(10)}
              className="touch-manipulation rounded-lg border border-slate-900 bg-slate-100 px-2 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 active:scale-[0.98]"
            >
              Roll d10
            </button>
            <button
              type="button"
              onClick={() => handleRoll(6)}
              className="touch-manipulation rounded-lg border border-slate-900 bg-slate-100 px-2 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 active:scale-[0.98]"
            >
              Roll d6
            </button>
          </div>
          <div className="mt-3 rounded-lg border border-teal-800/20 bg-teal-50 px-2 py-2 text-sm">
            {lastRoll ? (
              <p>
                <span className="font-semibold text-teal-800">{lastRoll.die.toUpperCase()}</span>{" "}
                result: <span className="font-bold text-slate-900">{lastRoll.value}</span>
              </p>
            ) : (
              <p className="text-slate-600">Click a die to roll.</p>
            )}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={toggleOpen}
        className="touch-manipulation rounded-full border-2 border-slate-900 bg-red-600 px-5 py-3.5 text-sm font-bold uppercase tracking-[0.1em] text-white shadow-[0_12px_28px_rgba(185,28,28,0.35)] transition hover:-translate-y-0.5 hover:bg-red-500 active:scale-[0.98]"
        aria-expanded={open}
        aria-label="Toggle dice roller"
      >
        Dice
      </button>
    </div>
  );
}
