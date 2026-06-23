"use client";

import { useEffect, useState } from "react";

/**
 * Emergence Timeline — "How this UI emerged" (Slice 1).
 *
 * Replays the agent's REAL event beats from a run: when it started, each tool
 * it called, when it composed its answer, and when it finished. The beats are
 * captured live during the run — page.tsx subscribes to the agent's AG-UI event
 * stream (agent.subscribe) and records each beat with a real elapsed timestamp.
 * This component only PACES the playback so the emergence reads as a deliberate
 * teaching beat instead of a flash. Nothing here is reconstructed: every row is
 * an event the agent actually emitted.
 *
 * What fires depends on the pattern. Controlled (toolChoice "auto") calls your
 * pre-built components one at a time, so its timeline is the richest:
 * start + tool* + composing + finish. Declarative-simplified and Open-Ended run
 * text-only (toolChoice "none"), emitting their whole spec in one pass:
 * start + composing + finish. The agentic loop can fire RUN_STARTED more than
 * once (a tool-calling round, then a compose round); the later one is labelled
 * "Continued" in page.tsx.
 */

export type EmergenceBeatKind = "start" | "think" | "tool" | "finish";

export interface EmergenceBeat {
  id: string;
  kind: EmergenceBeatKind;
  /** Short, human-legible label, e.g. "Started" or "Called render_card". */
  label: string;
  /** Optional secondary line. */
  detail?: string;
  /** Milliseconds elapsed since the run began. */
  at: number;
}

// Paced cadence between revealed beats. The first beat shows immediately; the
// rest follow on this interval so the reveal stays watchable in a live room.
const STEP_MS = 450;

const RAIL_LABEL =
  "mb-2 text-[11px] font-medium uppercase tracking-wider text-[var(--faint)]";

const KIND_DOT: Record<EmergenceBeatKind, string> = {
  start: "bg-[var(--petrol)]",
  think: "bg-neutral-400",
  tool: "bg-[var(--petrol)]",
  finish: "bg-neutral-700",
};

export function EmergenceTimeline({ beats }: { beats: EmergenceBeat[] }) {
  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState(0);

  // A new run (new beats array identity) collapses the reveal back to the
  // button, so the timeline is always played deliberately and never
  // auto-spoils the result of the next run.
  useEffect(() => {
    setOpen(false);
    setRevealed(0);
  }, [beats]);

  // Paced playback: once opened, step one beat at a time. The timer is scoped
  // to each step and cleared on re-run, unmount, or completion, so no stray
  // callback fires after teardown.
  useEffect(() => {
    if (!open || revealed >= beats.length) return;
    const id = setTimeout(
      () => setRevealed((n) => n + 1),
      revealed === 0 ? 0 : STEP_MS
    );
    return () => clearTimeout(id);
  }, [open, revealed, beats.length]);

  if (beats.length === 0) return null;

  const totalMs = beats[beats.length - 1]?.at ?? 0;
  const done = open && revealed >= beats.length;

  return (
    <section>
      <div className={RAIL_LABEL}>How this UI emerged</div>

      {!open ? (
        <button
          type="button"
          onClick={() => {
            setRevealed(0);
            setOpen(true);
          }}
          className="rounded-[var(--dt-radius)] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] transition-colors hover:bg-[var(--line)]"
        >
          Watch how the agent built this →
        </button>
      ) : (
        <div className="rounded-[var(--dt-radius)] border border-[var(--line)] bg-[var(--surface)] p-3">
          <ol className="flex flex-col gap-2">
            {beats.slice(0, revealed).map((b) => (
              <li key={b.id} className="flex items-start gap-2.5 text-sm">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${KIND_DOT[b.kind]}`}
                  aria-hidden
                />
                <span className="flex-1">
                  <span className="text-[var(--ink)]">{b.label}</span>
                  {b.detail ? (
                    <span className="block text-xs text-[var(--muted)]">
                      {b.detail}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 font-mono text-[11px] text-[var(--faint)]">
                  +{b.at}ms
                </span>
              </li>
            ))}
          </ol>

          {done ? (
            <div className="mt-3 flex items-center gap-3 border-t border-[var(--line)] pt-2 text-xs text-[var(--muted)]">
              <span>
                {beats.length} {beats.length === 1 ? "step" : "steps"} · {totalMs}ms
              </span>
              <button
                type="button"
                onClick={() => setRevealed(0)}
                className="text-[var(--petrol)] hover:underline"
              >
                Replay
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[var(--faint)] hover:underline"
              >
                Hide
              </button>
            </div>
          ) : (
            <div className="mt-2 text-[11px] text-[var(--faint)]">Replaying…</div>
          )}
        </div>
      )}
    </section>
  );
}
