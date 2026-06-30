"use client";

import { useEffect, useRef, useState } from "react";

type ConversationSummary = {
  username: string;
  unreadCount: number;
};

type GroupMessageLite = {
  id: number;
  senderUsername: string;
};

const SOUND_PREF_KEY = "needleweb.messageSoundEnabled";
const OPEN_MESSAGES_MODAL_EVENT = "needleweb:open-messages-modal";

function playNotificationTone() {
  try {
    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) {
      return;
    }

    const audioContext = new AudioContextConstructor();
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(880, now);

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.24);
    oscillator.onended = () => {
      void audioContext.close();
    };
  } catch {
    // Keep notifier resilient if audio cannot play.
  }
}

export default function MessageToastNotifier({ username }: { username: string }) {
  const [toastText, setToastText] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const baselineLoadedRef = useRef(false);
  const lastUnreadTotalRef = useRef(0);
  const lastGroupMessageIdRef = useRef(0);

  function isSoundEnabled() {
    try {
      return window.localStorage.getItem(SOUND_PREF_KEY) !== "false";
    } catch {
      return true;
    }
  }

  useEffect(() => {
    let cancelled = false;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    async function pollUnread() {
      try {
        const [conversationResponse, groupResponse] = await Promise.all([
          fetch("/api/messages", { cache: "no-store" }),
          fetch("/api/messages?with=__group__", { cache: "no-store" }),
        ]);

        const conversationData = (await conversationResponse.json()) as {
          conversations?: ConversationSummary[];
          error?: string;
        };
        const groupData = (await groupResponse.json()) as {
          messages?: GroupMessageLite[];
          error?: string;
        };

        if (!conversationResponse.ok || !groupResponse.ok) {
          return;
        }

        const unreadTotal = (conversationData.conversations ?? []).reduce(
          (sum, conversation) => sum + conversation.unreadCount,
          0,
        );
        const groupMessages = groupData.messages ?? [];
        const latestGroupMessageId = groupMessages.length > 0 ? groupMessages[groupMessages.length - 1].id : 0;

        if (!baselineLoadedRef.current) {
          baselineLoadedRef.current = true;
          lastUnreadTotalRef.current = unreadTotal;
          lastGroupMessageIdRef.current = latestGroupMessageId;
          return;
        }

        const directDelta = Math.max(0, unreadTotal - lastUnreadTotalRef.current);
        const hasNewAllChatMessage = groupMessages.some(
          (message) =>
            message.id > lastGroupMessageIdRef.current &&
            message.senderUsername.toLowerCase() !== username.toLowerCase(),
        );

        if (directDelta > 0 || hasNewAllChatMessage) {
          let label = "";

          if (directDelta > 0 && hasNewAllChatMessage) {
            const directLabel = directDelta === 1 ? "1 new message" : `${directDelta} new messages`;
            label = `${directLabel} and a new All Chat message.`;
          } else if (directDelta > 0) {
            label = directDelta === 1 ? "1 new message." : `${directDelta} new messages.`;
          } else {
            label = "a new All Chat message.";
          }

          if (!cancelled) {
            if (isSoundEnabled()) {
              playNotificationTone();
            }

            setToastText(`You received ${label}`);
            setToastVisible(true);

            if (hideTimer) {
              clearTimeout(hideTimer);
            }

            hideTimer = setTimeout(() => {
              setToastVisible(false);
            }, 4500);
          }
        }

        lastUnreadTotalRef.current = unreadTotal;
        lastGroupMessageIdRef.current = latestGroupMessageId;
      } catch {
        // Keep notifier silent if polling fails.
      }
    }

    void pollUnread();
    const intervalId = window.setInterval(() => {
      void pollUnread();
    }, 6000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
    };
  }, [username]);

  if (!toastText || !toastVisible) {
    return null;
  }

  return (
    <div className="fixed right-4 top-4 z-[90] max-w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-blue-900/25 bg-white px-3 py-2.5 shadow-[0_16px_36px_rgba(2,6,23,0.25)]">
      <p className="text-sm font-semibold text-slate-900">{toastText}</p>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setToastVisible(false);
            window.dispatchEvent(new Event(OPEN_MESSAGES_MODAL_EVENT));
          }}
          className="rounded-md border border-blue-800 bg-blue-50 px-2 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-blue-900 hover:bg-blue-100"
        >
          Open
        </button>
        <button
          type="button"
          onClick={() => setToastVisible(false)}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700 hover:bg-slate-100"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
