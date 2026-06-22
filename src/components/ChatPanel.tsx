"use client";

import { useEffect, useRef, useState } from "react";

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

/**
 * Chat surface: the conversational driver for the canvas. Presentational only.
 * It owns the input box and the running transcript, and hands each submitted
 * message to the page via onSend. The page runs it through the same agent and
 * run path the Run button uses, so per-pattern toolChoice and the reveal are
 * preserved; the chat never touches the agent directly.
 *
 * Decoupled from the dropped creativity/temperature lever by design: it sends a
 * message, nothing more.
 */
export function ChatPanel({
  turns,
  onSend,
  disabled,
  headerless = false,
}: {
  turns: ChatTurn[];
  onSend: (text: string) => void;
  /** True while a run is in flight (from either driver). */
  disabled: boolean;
  /** Omit the built-in "Chat" header (the nav parked-slot disclosure is the header). */
  headerless?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const logRef = useRef<HTMLDivElement>(null);

  // Keep the newest turn in view as the conversation grows.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, disabled]);

  const submit = () => {
    const text = draft.trim();
    if (!text || disabled) return;
    onSend(text);
    setDraft("");
  };

  return (
    <aside className="flex min-h-0 min-w-0 flex-col rounded-[var(--dt-radius)] border border-[var(--line)] bg-[var(--surface)]">
      {!headerless && (
        <div className="border-b border-[var(--line)] px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-[var(--faint)]">
          Chat
        </div>
      )}

      <div
        ref={logRef}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3"
      >
        {turns.length === 0 ? (
          <p className="text-xs leading-relaxed text-[var(--muted)]">
            Drive the render by chatting. Your message runs the active pattern
            and renders into the canvas, the same as the Run button.
          </p>
        ) : (
          turns.map((t, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--faint)]">
                {t.role === "user" ? "You" : "Studio"}
              </span>
              <p
                className={`whitespace-pre-wrap text-[13px] leading-relaxed ${
                  t.role === "user" ? "text-[var(--ink)]" : "text-[var(--muted)]"
                }`}
              >
                {t.text}
              </p>
            </div>
          ))
        )}
        {disabled ? (
          <span className="text-[11px] italic text-[var(--faint)]">
            Rendering…
          </span>
        ) : null}
      </div>

      <div className="border-t border-[var(--line)] p-2">
        <textarea
          className="w-full resize-none rounded-[var(--dt-radius)] border border-[var(--line-strong)] bg-[var(--surface)] p-2 text-[13px] leading-relaxed text-[var(--ink)] outline-none focus:border-[var(--ink)]"
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Ask the canvas to render something…"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled || !draft.trim()}
          className="mt-2 w-full rounded-[var(--dt-radius)] py-2 text-sm font-medium disabled:opacity-50"
          style={{
            background: "var(--dt-brand)",
            color: "var(--dt-brand-contrast)",
          }}
        >
          Send
        </button>
      </div>
    </aside>
  );
}
