"use client";

import { useRef, type ChangeEvent } from "react";
import { STARTER_DATASETS } from "@/lib/starter-data";
import { TeachingCard } from "@/components/TeachingCard";

/**
 * Data tab — paste anything, load a sample, or upload a file. Raw text,
 * bullets, JSON, a CSV, a Notion copy-paste. The agent structures it; this
 * tab never parses it. Samples and uploads are just text poured into the box,
 * so they ride the same `onChange` and persistence as typed input.
 */
export type DataContext = { audience: string; role: string; goal: string };

// WHO context fields hidden for the event (Pass 9 declutter): they are tone
// hints, not design constraints, so off-thesis for a tool about rules + catalog.
// Kept in source and fully wired (the context state + useAgentContext plumbing
// stays, harmless when empty); flip to true to restore the fields.
const SHOW_WHO_FIELDS: boolean = false;

export function DataTab({
  value,
  onChange,
  context,
  onContextChange,
  bare,
}: {
  value: string;
  onChange: (next: string) => void;
  context: DataContext;
  onContextChange: (next: DataContext) => void;
  /** In-popup mode: drop the title + teaching card (the popup chrome says them);
      keep the starter-chip row + textarea. */
  bare?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      // Native read-as-text. No parsing — the agent does the structuring.
      const text = await file.text();
      onChange(text);
    } catch {
      // Unreadable file — leave the current data untouched.
    } finally {
      // Reset so choosing the same file again still fires onChange.
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {!bare && (
        <div>
          <div className="text-sm font-semibold text-neutral-800">Your data</div>
          <p className="text-xs text-neutral-500">
            {"The agent's only source of facts."}
          </p>
        </div>
      )}

      {/* Samples + upload, tidied into one chip row. Both just load text into
          the box below; loading replaces whatever is there. Samples are
          embedded (no network). */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-neutral-400">Samples</span>
        {STARTER_DATASETS.map((s) => (
          <button
            key={s.id}
            type="button"
            title={`${s.filename} — ${s.description}`}
            onClick={() => onChange(s.csv)}
            className="rounded-full border border-[var(--line)] px-3 py-1 text-xs text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50"
          >
            {s.label}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-neutral-200" aria-hidden />
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Coming soon"
          className="cursor-not-allowed rounded-full border border-dashed border-[var(--line)] px-3 py-1 text-xs text-neutral-400"
        >
          Upload · soon
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.tsv,.txt,text/csv,text/plain,text/tab-separated-values"
          onChange={handleFile}
          className="hidden"
        />
      </div>

      {/* WHO context fields hidden (Pass 9 declutter): gated off, kept wired
          (context state + useAgentContext plumbing stays). */}
      {SHOW_WHO_FIELDS && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {(
          [
            ["audience", "Audience", "e.g. busy execs"],
            ["role", "Your role / voice", "e.g. design lead"],
            ["goal", "Goal", "e.g. decide what to cut"],
          ] as const
        ).map(([key, labelText, placeholder]) => (
          <label key={key} className="flex flex-col gap-1">
            <span className="text-xs font-medium text-neutral-700">
              {labelText}{" "}
              <span className="font-normal text-neutral-400">(optional)</span>
            </span>
            <input
              type="text"
              value={context[key]}
              onChange={(e) =>
                onContextChange({ ...context, [key]: e.target.value })
              }
              placeholder={placeholder}
              className="rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] px-2.5 py-1.5 text-sm outline-none focus:border-[var(--ink)]"
              spellCheck={false}
            />
          </label>
        ))}
        </div>
      )}

      <textarea
        className="min-h-[360px] resize-none rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] p-3 font-mono text-sm outline-none focus:border-[var(--ink)]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste anything here…"
        spellCheck={false}
      />
      {!bare && (
        <TeachingCard
          name="Data"
          collapsible
          mechanism="In a real product this data would arrive via an API, a database, or a connector. Here you paste it by hand to stand in for that. The agent never parses it in this panel."
          purpose="Whatever is in the box is the agent's only source of facts. It structures that raw text into the render on each run, so the data you bring decides what the render can say."
        />
      )}
    </div>
  );
}
