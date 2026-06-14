"use client";

/**
 * Rules tab — the design-rules file, in plain English.
 * No syntax. Write rules the way you'd brief a junior designer.
 * This is where attendees spend most of the night.
 */
export function RulesTab({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex h-full flex-col gap-2">
      <p className="text-sm text-neutral-500">
        Your design system, expressed as policy: what components appear when,
        and what the agent must never do. Plain English — every rule you write
        here binds the agent on the next run.
      </p>
      <textarea
        className="min-h-0 flex-1 resize-none rounded-lg border border-neutral-200 p-3 font-mono text-sm outline-none focus:border-neutral-400"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="# My design rules…"
        spellCheck={false}
      />
    </div>
  );
}
