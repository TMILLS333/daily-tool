"use client";

import { CATALOG, CATALOG_SAMPLES } from "@/lib/catalog";

/**
 * Catalog tab — one of the three creativity levers. Toggle which components
 * the agent may use. Each row is a switch plus a live sample, so widening or
 * narrowing the vocabulary is tactile. Toggling here flows reactively to the
 * Static tab's tools, the Declarative validator, the agent's catalog context,
 * and the why-panel's "components allowed" list.
 */
export function CatalogTab({
  enabled,
  onToggle,
}: {
  enabled: Record<string, boolean>;
  onToggle: (name: string, next: boolean) => void;
}) {
  return (
    <div className="flex h-full flex-col gap-2">
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
          return (
            <div
              key={entry.name}
              className="flex items-start justify-between gap-4 rounded-lg border border-[var(--line)] p-3"
            >
              <div className="min-w-0">
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
                <p className="mt-0.5 text-xs text-neutral-500">{entry.description}</p>
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
    </div>
  );
}
