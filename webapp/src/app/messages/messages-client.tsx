"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Role = "Admin" | "Member";

type MessageRecord = {
  id: number;
  senderUsername: string;
  recipientUsername: string | null;
  body: string;
  chatType?: "direct" | "group";
  groupName?: string | null;
  createdAt: string;
  readAt: string | null;
};

type ConversationSummary = {
  username: string;
  lastMessageAt: string | null;
  unreadCount: number;
};

type Props = {
  role: Role;
  username: string;
  initialWithUsername: string | null;
};

async function readJsonResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T;
  return data;
}

export default function MessagesClient({ role, username, initialWithUsername }: Props) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeUsername, setActiveUsername] = useState<string>(initialWithUsername ?? "");
  const [recipientOptions, setRecipientOptions] = useState<string[]>([]);
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);

  const canSend = useMemo(() => {
    if (!draft.trim()) {
      return false;
    }

    if (role === "Admin") {
      return Boolean(activeUsername);
    }

    return true;
  }, [activeUsername, draft, role]);

  useEffect(() => {
    let cancelled = false;

    async function loadConversations() {
      const conversationsResponse = await fetch("/api/messages", { cache: "no-store" });

      const data = await readJsonResponse<{ conversations?: ConversationSummary[]; error?: string }>(
        conversationsResponse,
      );

      if (!conversationsResponse.ok) {
        throw new Error(data.error ?? "Unable to load conversations.");
      }

      const nextConversations = data.conversations ?? [];
      if (cancelled) {
        return;
      }

      setConversations(nextConversations);
    }

    void loadConversations().catch((loadError) => {
      if (cancelled) {
        return;
      }

      setError(loadError instanceof Error ? loadError.message : "Unable to load conversations.");
    });

    const intervalId = window.setInterval(() => {
      void loadConversations().catch((loadError) => {
        if (cancelled) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Unable to load conversations.");
      });
    }, 8000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [role]);

  useEffect(() => {
    let cancelled = false;

    async function loadRecipients() {
      const response = await fetch("/api/messages/participants", { cache: "no-store" });
      const data = await readJsonResponse<{ participants?: string[]; error?: string }>(response);
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load participants.");
      }

      const participants = data.participants ?? [];
      if (cancelled) {
        return;
      }

      setRecipientOptions(participants);
      setActiveUsername((current) => {
        if (current === "__group__") {
          return current;
        }

        if (current && participants.includes(current)) {
          return current;
        }

        return "__group__";
      });
    }

    void loadRecipients().catch((loadError) => {
      if (cancelled) {
        return;
      }

      setError(loadError instanceof Error ? loadError.message : "Unable to load participants.");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadMessages() {
      if (!activeUsername) {
        setMessages([]);
        return;
      }

      setLoading(true);
      setError(null);

      const endpoint = `/api/messages?with=${encodeURIComponent(activeUsername)}`;

      try {
        const response = await fetch(endpoint, { cache: "no-store" });
        const data = await readJsonResponse<{ messages?: MessageRecord[]; withUsername?: string; error?: string }>(
          response,
        );

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to load messages.");
        }

        if (cancelled) {
          return;
        }

        setMessages(data.messages ?? []);
        if (role === "Member" && data.withUsername) {
          setActiveUsername(data.withUsername);
        }
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Unable to load messages.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadMessages();
    const intervalId = window.setInterval(() => {
      void loadMessages();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeUsername]);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  function onDraftChange(value: string) {
    setDraft(value);
    setTyping(value.trim().length > 0);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 1200);
  }

  async function refreshMessages() {
    if (!activeUsername) {
      setMessages([]);
      return;
    }

    const endpoint = `/api/messages?with=${encodeURIComponent(activeUsername)}`;
    const response = await fetch(endpoint, { cache: "no-store" });
    const data = await readJsonResponse<{ messages?: MessageRecord[]; error?: string }>(response);

    if (!response.ok) {
      throw new Error(data.error ?? "Unable to refresh messages.");
    }

    setMessages(data.messages ?? []);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSend) {
      return;
    }

    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: activeUsername,
          body: draft,
        }),
      });

      const data = await readJsonResponse<{ error?: string }>(response);
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to send message.");
      }

      setDraft("");

      await refreshMessages();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send message.");
    } finally {
      setSending(false);
    }
  }

  async function onEditMessage(messageId: number) {
    const nextBody = editingDraft.trim();
    if (!nextBody) {
      setError("Message body is required.");
      return;
    }

    setError(null);
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body: nextBody }),
      });

      const data = await readJsonResponse<{ error?: string }>(response);
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to edit message.");
      }

      setEditingMessageId(null);
      setEditingDraft("");
      await refreshMessages();
    } catch (editError) {
      setError(editError instanceof Error ? editError.message : "Unable to edit message.");
    }
  }

  async function onDeleteMessage(messageId: number) {
    setError(null);
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: "DELETE",
      });
      const data = await readJsonResponse<{ error?: string }>(response);
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to delete message.");
      }

      if (editingMessageId === messageId) {
        setEditingMessageId(null);
        setEditingDraft("");
      }
      await refreshMessages();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete message.");
    }
  }

  const unreadCountByUsername = new Map(
    conversations.map((conversation) => [conversation.username.toLowerCase(), conversation.unreadCount]),
  );

  const activeChatLabel =
    activeUsername === "__group__"
      ? "Group Chat"
      : activeUsername || (role === "Admin" ? "Select a player" : "Select a recipient");

  return (
    <section className="grid gap-4">
      <div className="rounded-[1.25rem] border border-slate-900/15 bg-white p-4">
        <label className="mb-3 block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Chat target</span>
          <select
            value={activeUsername}
            onChange={(event) => setActiveUsername(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none transition focus:border-blue-700"
          >
            <option value="__group__">All Chat</option>
            {recipientOptions.map((recipientUsername) => {
              const unreadCount = unreadCountByUsername.get(recipientUsername.toLowerCase()) ?? 0;
              const suffix = unreadCount > 0 ? ` (${unreadCount} unread)` : "";
              return (
                <option key={recipientUsername} value={recipientUsername}>
                  {`${recipientUsername}${suffix}`}
                </option>
              );
            })}
          </select>
        </label>

        <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-900/10 pb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Messages</p>
            <h2 className="text-lg font-semibold text-slate-950">{activeChatLabel}</h2>
          </div>
          {loading ? <p className="text-xs text-slate-500">Refreshing...</p> : null}
        </div>

        {!activeUsername ? (
          <p className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Select a chat target to load messages.
          </p>
        ) : null}

        <div className="max-h-[52vh] space-y-2 overflow-y-auto rounded-lg bg-slate-50 p-3">
          {messages.length === 0 ? (
            <p className="text-sm text-slate-500">No messages yet.</p>
          ) : (
            messages.map((message) => {
              const ownMessage = message.senderUsername.toLowerCase() === username.toLowerCase();
              return (
                <article
                  key={message.id}
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${ownMessage ? "ml-auto bg-blue-800 text-white" : "bg-white text-slate-900"}`}
                >
                  {editingMessageId === message.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editingDraft}
                        onChange={(event) => setEditingDraft(event.target.value)}
                        rows={3}
                        className="w-full rounded-md border border-slate-900/25 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMessageId(null);
                            setEditingDraft("");
                          }}
                          className="rounded-md border border-slate-900/25 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-700"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => void onEditMessage(message.id)}
                          className="rounded-md bg-blue-700 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-white"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {message.chatType === "group" ? (
                        <p className={`mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${ownMessage ? "text-blue-100" : "text-slate-500"}`}>
                          {message.senderUsername}
                        </p>
                      ) : null}
                      <p className="whitespace-pre-wrap leading-6">{message.body}</p>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className={`text-[10px] ${ownMessage ? "text-blue-100" : "text-slate-500"}`}>
                          {new Date(message.createdAt).toLocaleString()}
                        </p>
                        {ownMessage ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMessageId(message.id);
                                setEditingDraft(message.body);
                              }}
                              className={`text-[10px] font-semibold uppercase tracking-[0.1em] ${ownMessage ? "text-blue-100 hover:text-white" : "text-slate-500 hover:text-slate-700"}`}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void onDeleteMessage(message.id)}
                              className={`text-[10px] font-semibold uppercase tracking-[0.1em] ${ownMessage ? "text-blue-100 hover:text-white" : "text-slate-500 hover:text-slate-700"}`}
                            >
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </>
                  )}
                </article>
              );
            })
          )}
          <div ref={scrollAnchorRef} />
        </div>

        <form onSubmit={onSubmit} className="mt-3 flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder={!activeUsername ? "Select chat target" : "Write a message"}
            disabled={!activeUsername}
            className="h-11 w-full rounded-lg border border-slate-900/20 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-700 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
          <button
            type="submit"
            disabled={!canSend || sending}
            className="h-11 rounded-lg bg-blue-800 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </form>

        {typing ? <p className="mt-2 text-xs text-slate-500">Typing...</p> : null}

        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </div>
    </section>
  );
}
