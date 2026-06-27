"use client";

import { HonestyChip } from "@/components/TeachingCard";

/**
 * Native messages — a READ-ONLY reference card, shown below the "Reported by the
 * model" account card.
 *
 * This is the honest counterweight to that card. The account card is ELICITED
 * (the prompt asks the agent for a ```why block) and REFORMATTED (parseWhy +
 * relabeled fields). This card does neither: it renders the agent's own
 * `agent.messages` raw and verbatim — role, content (fenced blocks intact), and
 * any toolCalls — exactly as they arrive over the wire (the "messages" payload
 * visible in the Network tab). No parsing, no relabeling, no added vocabulary.
 *
 * Purpose: judge whether the agent's native output is "good enough on its own"
 * — i.e. whether the ```why scaffolding the account card depends on is even
 * necessary. Gated by SHOW_NATIVE_MESSAGES in page.tsx (an evaluation flag, OFF
 * for the attendee/event view).
 *
 * Presentational by design: it takes a `messages` array and renders it. It calls
 * no agent hooks, so the same component can later render the Real A2UI agent's
 * messages by simply passing them in.
 */

const cardClass =
  "rounded-[var(--dt-radius)] border border-[var(--line)] bg-[var(--surface)] p-5";

export function NativeMessages({ messages }: { messages: unknown[] }) {
  // Show only the agent's turns — this is "the agent's messaging," not the
  // designer's echoed input. Selecting WHOSE messages is not editorializing the
  // CONTENT: each shown message is rendered byte-for-byte as received.
  const assistant = messages.filter(
    (m): m is Record<string, unknown> =>
      !!m && typeof m === "object" && (m as { role?: unknown }).role === "assistant"
  );

  return (
    <div className={cardClass}>
      <div className="mb-4 flex items-center gap-2">
        <span className="text-[12px] font-medium text-[var(--ink)]">
          Native messages
        </span>
        <HonestyChip variant="soft">Raw · unparsed</HonestyChip>
      </div>
      <p className="mb-4 text-[11px] leading-relaxed text-[var(--faint)]">
        Straight from the agent — the <code className="font-mono">messages</code>{" "}
        payload exactly as received over the wire. Nothing parsed, relabeled, or
        asked for.
      </p>
      {assistant.length === 0 ? (
        <p className="text-sm text-[var(--faint)]">
          No agent messages captured for this run yet.
        </p>
      ) : (
        <div className="flex max-h-[420px] flex-col gap-3 overflow-y-auto">
          {assistant.map((m, i) => (
            <pre
              key={i}
              className="overflow-x-auto whitespace-pre-wrap break-words rounded-[var(--dt-radius)] border border-[var(--line)] bg-[var(--paper)] p-3 font-mono text-[11px] leading-relaxed text-[var(--ink)]"
            >
              {JSON.stringify(m, null, 2)}
            </pre>
          ))}
        </div>
      )}
    </div>
  );
}
