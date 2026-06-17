"use client";

import { useRef, type ChangeEvent } from "react";
import { STARTER_DATASETS } from "@/lib/starter-data";

/**
 * Data tab — paste anything, load a sample, or upload a file. Raw text,
 * bullets, JSON, a CSV, a Notion copy-paste. The agent structures it; this
 * tab never parses it. Samples and uploads are just text poured into the box,
 * so they ride the same `onChange` and persistence as typed input.
 */
export function DataTab({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
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
    <div className="flex h-full flex-col gap-2">
      <p className="text-sm text-neutral-500">
        Paste your daily pile of text below — meeting notes, audit findings, a
        brief, a CSV, anything. This is the only data the agent is allowed to
        use. It is never parsed here; the agent does the structuring.
      </p>

      {/* Starters + upload. Both just load text into the box below; loading
          replaces whatever is there. Samples are embedded (no network). */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-neutral-700">
          No data handy? Load a sample CSV:
        </span>
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
          onClick={() => fileRef.current?.click()}
          className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-medium text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50"
        >
          Upload a file…
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.tsv,.txt,text/csv,text/plain,text/tab-separated-values"
          onChange={handleFile}
          className="hidden"
        />
      </div>
      <p className="text-xs text-neutral-400">
        Loading a sample or a file replaces the box below.
      </p>

      <textarea
        className="min-h-0 flex-1 resize-none rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] p-3 font-mono text-sm outline-none focus:border-[var(--ink)]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste anything here…"
        spellCheck={false}
      />
    </div>
  );
}
