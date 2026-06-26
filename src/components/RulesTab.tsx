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
            <HonestyChip variant="soft">Soft · not guaranteed</HonestyChip>
          </div>
          <p className="text-sm text-neutral-500">
            Optional, soft guidance. Use only if the catalog and descriptions
            aren&apos;t enough. The agent is asked to follow each rule and reports
            that it did, but nothing enforces it — unlike the Catalog.
          </p>
        </>
      )}
      <textarea
        className="ta"
        style={{ minHeight: 260 }}
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
