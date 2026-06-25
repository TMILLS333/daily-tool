"use client";

import { TeachingCard, HonestyChip } from "@/components/TeachingCard";

/**
 * Rules tab — the design-rules file, in plain English.
 * No syntax. Write rules the way you'd brief a junior designer.
 * This is where attendees spend most of the night.
 */
export function RulesTab({
  value,
  onChange,
  bare,
}: {
  value: string;
  onChange: (next: string) => void;
  /** In-popup mode: the popup chrome already states the chip + intro + footer,
      so drop this component's own header and teaching card to avoid doubling. */
  bare?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      {!bare && (
        <>
          <div className="flex justify-end">
            <HonestyChip variant="soft">Soft · instructed</HonestyChip>
          </div>
          <p className="text-sm text-neutral-500">
            Your design system, expressed as policy: what components appear when,
            and what the agent must never do. Plain English: every rule you write
            here binds the agent on the next run.
          </p>
        </>
      )}
      <textarea
        className="min-h-[360px] resize-none rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] p-3 font-mono text-sm outline-none focus:border-[var(--ink)]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="# My design rules…"
        spellCheck={false}
      />
      {!bare && (
        <TeachingCard
          name="Rules"
          mechanism="Your rules are injected into the agent's prompt as context. The agent is asked to follow them and reports that it did, but nothing in code guarantees it, unlike the Catalog, whose limits are enforced at render."
          purpose="Steer judgment and priorities in plain language. Strong influence, not a hard gate."
        />
      )}
    </div>
  );
}
