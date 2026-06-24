"use client";

import type { ReactNode } from "react";

// First-run guided sequence (Pass 10). Pure chrome: a numbered Data -> Rules
// -> Catalog -> Theme progress header, the active step's existing layer
// component (passed in, not reimplemented), Back/Next navigation, and a
// request input + run arrow on the final step. A faint placeholder shows
// where the interface will appear. After the first successful run, page.tsx
// collapses this into the working shell for good.
export type SetupStep = { key: string; label: string; node: ReactNode };

export function SetupSequence({
  steps,
  current,
  onCurrent,
  request,
  onRequestChange,
  onRun,
  running,
}: {
  steps: SetupStep[];
  current: number;
  onCurrent: (i: number) => void;
  request: string;
  onRequestChange: (v: string) => void;
  onRun: () => void;
  running: boolean;
}) {
  const last = steps.length - 1;
  const step = steps[current];
  const isLast = current === last;

  return (
    <div className="flex flex-col gap-6">
      {/* Progress header: numbered Data -> Rules -> Catalog -> Theme. */}
      <ol className="flex items-center gap-2">
        {steps.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={s.key} className="flex flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => onCurrent(i)}
                className="flex items-center gap-2 text-left"
                aria-current={active ? "step" : undefined}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] ${
                    active || done
                      ? "bg-[var(--petrol)] text-white"
                      : "border border-[var(--line)] text-[var(--faint)]"
                  }`}
                  aria-hidden
                >
                  {done ? "✓" : i + 1}
                </span>
                <span
                  className={`text-sm ${
                    active
                      ? "font-medium text-[var(--ink)]"
                      : "text-[var(--muted)]"
                  }`}
                >
                  {s.label}
                </span>
              </button>
              {i < last ? (
                <span className="h-px flex-1 bg-[var(--line)]" aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ol>

      {/* The active step's existing layer component. */}
      <div>{step.node}</div>

      {/* Footer: Back/Next, or the run trigger on the final step. */}
      {isLast ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-end gap-2 rounded-[var(--dt-radius)] border border-[var(--line-strong)] bg-[var(--surface)] p-2 transition-colors focus-within:border-[var(--ink)]">
            <textarea
              className="min-h-[44px] w-full resize-none bg-transparent px-2 py-1.5 font-mono text-[13px] leading-relaxed text-[var(--ink)] outline-none"
              rows={2}
              value={request}
              onChange={(e) => onRequestChange(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  onRun();
                }
              }}
              placeholder="Describe what you want from your data…"
              spellCheck={false}
            />
            <button
              type="button"
              aria-label="Run"
              onClick={onRun}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--dt-radius)] text-base font-medium transition-colors ${
                running ? "animate-pulse" : ""
              }`}
              style={{
                background: "var(--dt-brand)",
                color: "var(--dt-brand-contrast)",
              }}
            >
              →
            </button>
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => onCurrent(current - 1)}
              className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
            >
              ← Back
            </button>
            <span className="text-xs text-[var(--faint)]">
              All four set. Describe what you want, then run.
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          {current > 0 ? (
            <button
              type="button"
              onClick={() => onCurrent(current - 1)}
              className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
            >
              ← Back
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() => onCurrent(current + 1)}
            className="rounded-[var(--dt-radius)] px-4 py-2 text-sm font-medium transition-colors"
            style={{
              background: "var(--dt-brand)",
              color: "var(--dt-brand-contrast)",
            }}
          >
            Next: {steps[current + 1].label} →
          </button>
        </div>
      )}

      {/* Faint placeholder: where the interface will appear. */}
      <div className="flex min-h-[160px] items-center justify-center rounded-[var(--dt-radius)] border border-dashed border-[var(--line)] text-sm text-[var(--faint)]">
        Your interface appears here once you run.
      </div>
    </div>
  );
}
