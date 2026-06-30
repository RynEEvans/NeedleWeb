"use client";

import { useEffect, useState } from "react";
import MessagesClient from "./messages/messages-client";

const OPEN_MESSAGES_MODAL_EVENT = "needleweb:open-messages-modal";

type RollState = {
  die: "d10" | "d6";
  values: number[];
  total: number;
  count: number;
};

type Props = {
  unreadMessagesCount?: number;
  role: "Admin" | "Member";
  username: string;
};

type GroupMessageLite = {
  id: number;
  senderUsername: string;
};

function roll(sides: number) {
  return Math.floor(Math.random() * sides) + 1;
}

export default function DiceRollerBubble({ unreadMessagesCount = 0, role, username }: Props) {
  const [open, setOpen] = useState(false);
  const [rollerOpen, setRollerOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [rollCount, setRollCount] = useState(1);
  const [lastRoll, setLastRoll] = useState<RollState | null>(null);
  const [messageTargets, setMessageTargets] = useState<string[]>([]);
  const [sendTarget, setSendTarget] = useState("__group__");
  const [sendingRoll, setSendingRoll] = useState(false);
  const [sendRollStatus, setSendRollStatus] = useState<string | null>(null);
  const [hasNewAllChatMessage, setHasNewAllChatMessage] = useState(false);
  const [lastSeenAllChatId, setLastSeenAllChatId] = useState<number | null>(null);

  async function syncAllChatSeen() {
    try {
      const response = await fetch("/api/messages?with=__group__", { cache: "no-store" });
      const data = (await response.json()) as { messages?: GroupMessageLite[]; error?: string };
      if (!response.ok) {
        return;
      }

      const messages = data.messages ?? [];
      const latestId = messages.length > 0 ? messages[messages.length - 1].id : 0;
      setLastSeenAllChatId(latestId);
      setHasNewAllChatMessage(false);
    } catch {
      // Keep the indicator resilient if polling fails.
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMessagesOpen(false);
      }
    }

    function onOpenMessagesModal() {
      setMessagesOpen(true);
      setOpen(false);
      setRollerOpen(false);
      void syncAllChatSeen();
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_MESSAGES_MODAL_EVENT, onOpenMessagesModal);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_MESSAGES_MODAL_EVENT, onOpenMessagesModal);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function pollAllChat() {
      try {
        const response = await fetch("/api/messages?with=__group__", { cache: "no-store" });
        const data = (await response.json()) as { messages?: GroupMessageLite[]; error?: string };

        if (!response.ok || cancelled) {
          return;
        }

        const messages = data.messages ?? [];
        const latestId = messages.length > 0 ? messages[messages.length - 1].id : 0;

        if (lastSeenAllChatId === null) {
          setLastSeenAllChatId(latestId);
          return;
        }

        if (latestId <= lastSeenAllChatId) {
          return;
        }

        const hasIncomingGroupMessage = messages.some(
          (message) =>
            message.id > lastSeenAllChatId &&
            message.senderUsername.toLowerCase() !== username.toLowerCase(),
        );

        if (hasIncomingGroupMessage) {
          setHasNewAllChatMessage(true);
        }
      } catch {
        // Keep the indicator silent if polling fails.
      }
    }

    void pollAllChat();
    const intervalId = window.setInterval(() => {
      void pollAllChat();
    }, 6000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [lastSeenAllChatId, username]);

  useEffect(() => {
    let cancelled = false;

    async function loadTargets() {
      try {
        const response = await fetch("/api/messages/participants", { cache: "no-store" });
        const data = (await response.json()) as { participants?: string[]; error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to load message targets.");
        }

        if (cancelled) {
          return;
        }

        setMessageTargets(data.participants ?? []);
      } catch {
        if (cancelled) {
          return;
        }

        setMessageTargets([]);
      }
    }

    void loadTargets();

    return () => {
      cancelled = true;
    };
  }, []);

  function toggleOpen() {
    setOpen((current) => !current);
    if (open) {
      setRollerOpen(false);
    }
  }

  function handleRoll(sides: 10 | 6) {
    const values = Array.from({ length: rollCount }, () => roll(sides));
    const total = values.reduce((sum, value) => sum + value, 0);
    setLastRoll({ die: sides === 10 ? "d10" : "d6", values, total, count: rollCount });
    setSendRollStatus(null);
  }

  async function sendRollToMessages() {
    if (!lastRoll || sendingRoll || !sendTarget) {
      return;
    }

    setSendingRoll(true);
    setSendRollStatus(null);

    const body = `${username} rolled ${lastRoll.count}${lastRoll.die.toUpperCase()}: [${lastRoll.values.join(", ")}] | Total: ${lastRoll.total}`;

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: sendTarget,
          body,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to send roll to messages.");
      }

      setSendRollStatus(sendTarget === "__group__" ? "Sent to group messages." : `Sent to ${sendTarget}.`);
    } catch (error) {
      setSendRollStatus(error instanceof Error ? error.message : "Unable to send roll to messages.");
    } finally {
      setSendingRoll(false);
    }
  }

  return (
    <div
      className="fixed z-50"
      style={{
        right: "max(1rem, env(safe-area-inset-right))",
        bottom: "max(1rem, env(safe-area-inset-bottom))",
      }}
    >
      <div
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-200 sm:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={toggleOpen}
        aria-hidden="true"
      />

      <div
        className={`absolute bottom-full right-0 mb-3 flex flex-col items-end gap-2 transition-all duration-200 ${open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"}`}
        style={{ zIndex: 51 }}
      >
          <button
            type="button"
            onClick={() => setRollerOpen((current) => !current)}
            className="touch-manipulation relative z-[51] rounded-full border border-slate-900 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-900 shadow-[0_10px_20px_rgba(2,6,23,0.22)] transition hover:bg-slate-100 active:scale-[0.98]"
          >
            Dice
          </button>
          <button
            type="button"
            onClick={() => {
              setMessagesOpen(true);
              setOpen(false);
              setRollerOpen(false);
              void syncAllChatSeen();
            }}
            className="relative z-[51] flex items-center gap-2 rounded-full border border-slate-900 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-900 shadow-[0_10px_20px_rgba(2,6,23,0.22)] transition hover:bg-slate-100"
          >
            <span>Messages</span>
            {hasNewAllChatMessage ? (
              <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                All
              </span>
            ) : null}
            {unreadMessagesCount > 0 ? (
              <span className="rounded-full bg-blue-800 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {unreadMessagesCount}
              </span>
            ) : null}
          </button>
      </div>

      {messagesOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-3 sm:p-6"
          onClick={() => setMessagesOpen(false)}
          aria-modal="true"
          role="dialog"
          aria-label="Messages"
        >
          <div
            className="flex h-[min(92vh,48rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_22px_55px_rgba(2,6,23,0.35)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-700">Messages</p>
              <button
                type="button"
                onClick={() => setMessagesOpen(false)}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700 transition hover:bg-slate-100"
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
              <MessagesClient role={role} username={username} initialWithUsername="__group__" />
            </div>
          </div>
        </div>
      ) : null}

      {rollerOpen ? (
        <div className="fixed inset-x-3 z-50 rounded-2xl border border-slate-900/15 bg-white p-4 shadow-[0_20px_45px_rgba(2,6,23,0.28)] sm:hidden" style={{ bottom: "calc(max(1rem, env(safe-area-inset-bottom)) + 4.5rem)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
            Dice Roller
          </p>
          <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">Dice count</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRollCount((current) => Math.max(1, current - 1))}
                className="h-7 w-7 rounded-md border border-slate-900 text-sm font-bold text-slate-900"
                aria-label="Decrease dice count"
              >
                -
              </button>
              <span className="w-8 text-center text-sm font-semibold text-slate-900">{rollCount}</span>
              <button
                type="button"
                onClick={() => setRollCount((current) => Math.min(20, current + 1))}
                className="h-7 w-7 rounded-md border border-slate-900 text-sm font-bold text-slate-900"
                aria-label="Increase dice count"
              >
                +
              </button>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleRoll(10)}
              className="touch-manipulation rounded-lg border border-slate-900 bg-slate-100 px-2 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 active:scale-[0.98]"
            >
              Roll d10 x{rollCount}
            </button>
            <button
              type="button"
              onClick={() => handleRoll(6)}
              className="touch-manipulation rounded-lg border border-slate-900 bg-slate-100 px-2 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 active:scale-[0.98]"
            >
              Roll d6 x{rollCount}
            </button>
          </div>
          <div className="mt-3 rounded-lg border border-blue-900/20 bg-blue-50 px-2 py-2 text-sm">
            {lastRoll ? (
              <div className="space-y-1">
                <p>
                  <span className="font-semibold text-blue-900">{lastRoll.die.toUpperCase()} x{lastRoll.count}</span>
                </p>
                <p className="text-slate-700">Rolls: {lastRoll.values.join(", ")}</p>
                <p>
                  Total: <span className="font-bold text-slate-900">{lastRoll.total}</span>
                </p>
                <div className="mt-1 space-y-1">
                  <label className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600">
                    Send to
                  </label>
                  <select
                    value={sendTarget}
                    onChange={(event) => setSendTarget(event.target.value)}
                    className="h-8 w-full rounded-md border border-slate-900 bg-white px-2 text-xs outline-none"
                  >
                    <option value="__group__">Group Chat</option>
                    {messageTargets.map((target) => (
                      <option key={`mobile-target-${target}`} value={target}>
                        {target}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => void sendRollToMessages()}
                  disabled={sendingRoll || !sendTarget}
                  className="mt-1 rounded-md border border-blue-900 bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-blue-900 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {sendingRoll ? "Sending..." : "Send to Messages"}
                </button>
                {sendRollStatus ? <p className="text-[11px] text-slate-700">{sendRollStatus}</p> : null}
              </div>
            ) : (
              <p className="text-slate-600">Tap a die to roll.</p>
            )}
          </div>
        </div>
      ) : null}

      {rollerOpen ? (
        <div className="absolute bottom-full right-0 mb-3 hidden w-60 max-w-[80vw] rounded-2xl border border-slate-900/15 bg-white/95 p-3 shadow-[0_16px_40px_rgba(2,6,23,0.25)] backdrop-blur sm:block">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
            Dice Roller
          </p>
          <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">Count</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRollCount((current) => Math.max(1, current - 1))}
                className="h-7 w-7 rounded-md border border-slate-900 text-sm font-bold text-slate-900"
                aria-label="Decrease dice count"
              >
                -
              </button>
              <span className="w-8 text-center text-sm font-semibold text-slate-900">{rollCount}</span>
              <button
                type="button"
                onClick={() => setRollCount((current) => Math.min(20, current + 1))}
                className="h-7 w-7 rounded-md border border-slate-900 text-sm font-bold text-slate-900"
                aria-label="Increase dice count"
              >
                +
              </button>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleRoll(10)}
              className="touch-manipulation rounded-lg border border-slate-900 bg-slate-100 px-2 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 active:scale-[0.98]"
            >
              Roll d10 x{rollCount}
            </button>
            <button
              type="button"
              onClick={() => handleRoll(6)}
              className="touch-manipulation rounded-lg border border-slate-900 bg-slate-100 px-2 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 active:scale-[0.98]"
            >
              Roll d6 x{rollCount}
            </button>
          </div>
          <div className="mt-3 rounded-lg border border-blue-900/20 bg-blue-50 px-2 py-2 text-sm">
            {lastRoll ? (
              <div className="space-y-1">
                <p>
                  <span className="font-semibold text-blue-900">{lastRoll.die.toUpperCase()} x{lastRoll.count}</span>
                </p>
                <p className="text-slate-700">Rolls: {lastRoll.values.join(", ")}</p>
                <p>
                  Total: <span className="font-bold text-slate-900">{lastRoll.total}</span>
                </p>
                <div className="mt-1 space-y-1">
                  <label className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600">
                    Send to
                  </label>
                  <select
                    value={sendTarget}
                    onChange={(event) => setSendTarget(event.target.value)}
                    className="h-8 w-full rounded-md border border-slate-900 bg-white px-2 text-xs outline-none"
                  >
                    <option value="__group__">Group Chat</option>
                    {messageTargets.map((target) => (
                      <option key={`desktop-target-${target}`} value={target}>
                        {target}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => void sendRollToMessages()}
                  disabled={sendingRoll || !sendTarget}
                  className="mt-1 rounded-md border border-blue-900 bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-blue-900 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {sendingRoll ? "Sending..." : "Send to Messages"}
                </button>
                {sendRollStatus ? <p className="text-[11px] text-slate-700">{sendRollStatus}</p> : null}
              </div>
            ) : (
              <p className="text-slate-600">Click a die to roll.</p>
            )}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={toggleOpen}
        className="touch-manipulation relative z-[51] flex h-12 w-12 items-center justify-center rounded-full border-2 border-slate-900 bg-white text-xl font-bold text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.28)] transition hover:-translate-y-0.5 hover:bg-slate-100 active:scale-[0.98]"
        aria-expanded={open}
        aria-label="Toggle quick actions"
      >
        <span className={`transition-transform duration-200 ${open ? "rotate-45" : "rotate-0"}`}>+</span>
      </button>
    </div>
  );
}
