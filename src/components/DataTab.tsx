"use client";

/**
 * Data tab — paste anything. Raw text, bullets, JSON, a Notion copy-paste.
 * The agent structures it; this tab never tries to parse it.
 */
export function DataTab({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex h-full flex-col gap-2">
      <p className="text-sm text-neutral-500">
        Paste your daily pile of text below — meeting notes, audit findings, a
        brief, anything. This is the only data the agent is allowed to use.
      </p>
      <textarea
        className="min-h-0 flex-1 resize-none rounded-lg border border-neutral-200 p-3 font-mono text-sm outline-none focus:border-neutral-400"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste anything here…"
        spellCheck={false}
      />
    </div>
  );
}
