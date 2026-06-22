"use client";

import { CATALOG, CATALOG_SAMPLES } from "@/lib/catalog";
import { TeachingCard, HonestyChip } from "@/components/TeachingCard";

/**
 * Catalog tab: one of the three creativity levers. Toggle which components the
 * agent may use, and edit the description the agent reads for each. Each row is
 * a switch plus an editable description plus a live sample, so widening or
 * narrowing the vocabulary, and steering how the agent reads it, stays tactile.
 * Toggling and editing flow reactively to the agent's catalog context on the
 * next run.
 */
export function CatalogTab({
  enabled,
  onToggle,
  descriptions,
  onDescriptionChange,
  onDescriptionReset,
}: {
  enabled: Record<string, boolean>;
  onToggle: (name: string, next: boolean) => void;
  descriptions: Record<string, string>;
  onDescriptionChange: (name: string, value: string) => void;
  onDescriptionReset: (name: string) => void;
}) {
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex justify-end">
        <HonestyChip variant="hard">Hard · enforced</HonestyChip>
      </div>
      <p className="text-sm text-neutral-500">
        Lever 1 of 3: catalog breadth. This is your design system as an
        allow-list. Turn a component off and it disappears from every pattern
        on the next run — the agent literally cannot reach for it.
      </p>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {CATALOG.map((entry) => {
          const on = enabled[entry.name] ?? false;
          const sample = CATALOG_SAMPLES[entry.name];
          const C = entry.Component;
          const edited = descriptions[entry.name] !== undefined;
          const descValue = edited ? descriptions[entry.name] : entry.description;
          return (
            <div
              key={entry.name}
              className="flex items-start justify-between gap-4 rounded-lg border border-[var(--line)] p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{entry.name}</span>
                  {entry.container ? (
                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500">
                      container
                    </span>
                  ) : null}
                  {!entry.enabled ? (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">
                      off by default
                    </span>
                  ) : null}
                </div>
                <div className="mt-1">
                  <textarea
                    value={descValue}
                    onChange={(e) => onDescriptionChange(entry.name, e.target.value)}
                    rows={2}
                    aria-label={`${entry.name} description (the agent reads this)`}
                    className="w-full resize-y rounded border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-xs text-neutral-600 focus:border-[var(--dt-brand)] focus:outline-none"
                  />
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-neutral-400">
                    <span>the agent reads this</span>
                    {edited ? (
                      <>
                        <span aria-hidden>·</span>
                        <span className="text-amber-700">edited</span>
                        <button
                          type="button"
                          onClick={() => onDescriptionReset(entry.name)}
                          className="text-neutral-500 underline-offset-2 hover:underline"
                        >
                          Reset to default
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
                {sample ? (
                  <div className="mt-2">
                    {entry.container ? (
                      <C {...sample.props}>
                        <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs">one</span>
                        <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs">two</span>
                      </C>
                    ) : (
                      <C {...sample.props} />
                    )}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={`${entry.name} ${on ? "enabled" : "disabled"}`}
                onClick={() => onToggle(entry.name, !on)}
                className={`relative mt-1 h-6 w-11 shrink-0 rounded-full transition-colors ${
                  on ? "bg-[var(--dt-brand)]" : "bg-neutral-300"
                }`}
                title={on ? "Enabled — click to disable" : "Disabled — click to enable"}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    on ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
      <TeachingCard
        name="the Catalog"
        mechanism="A typed component registry. Toggle one off and it leaves the agent's vocabulary, and the renderer hard-rejects anything not on the list. The description is the prose the agent reads, so editing it steers what gets built."
        purpose="The catalog is your design space: it decides which components can ever appear, enforced in code, not merely requested."
      />
    </div>
  );
}
