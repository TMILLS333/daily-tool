"use client";

import { useState } from "react";
import { CATALOG, CATALOG_SAMPLES } from "@/lib/catalog";
import { TeachingCard, HonestyChip } from "@/components/TeachingCard";

/**
 * Catalog tab: one of the three creativity levers. A grouped gallery of
 * component cards. Toggle which components the agent may use; reveal "what the
 * agent sees" (the description it reads, plus a live sample) on demand; Edit
 * the description to steer how the agent reads it. Basic = the default-on
 * presentational primitives; Structured = the data-shape components. Grouping
 * lives here (not in the catalog data) to keep the change to this layer.
 */
const BASIC = ["Heading", "Card", "Badge", "List", "Button", "Stack"];
const STRUCTURED = ["PieChart", "Table", "Timeline", "Kanban", "Matrix"];

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
  // Per-card UI state, keyed by component name: which cards have their "what
  // the agent sees" revealed, and which are in edit mode.
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Record<string, boolean>>({});

  const sectionLabel =
    "mb-2 text-[11px] font-medium uppercase tracking-wider text-[var(--faint)]";

  const renderCard = (name: string) => {
    const entry = CATALOG.find((e) => e.name === name);
    if (!entry) return null;
    const on = enabled[entry.name] ?? false;
    const sample = CATALOG_SAMPLES[entry.name];
    const C = entry.Component;
    const edited = descriptions[entry.name] !== undefined;
    const descValue = edited ? descriptions[entry.name] : entry.description;
    const isRevealed = revealed[entry.name] ?? false;
    const isEditing = editing[entry.name] ?? false;
    return (
      <div
        key={entry.name}
        className="flex flex-col rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3"
      >
        {/* Header: name + tags + toggle */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="text-sm font-semibold">{entry.name}</span>
            {edited ? (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">
                edited
              </span>
            ) : null}
            {!entry.enabled ? (
              <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500">
                off by default
              </span>
            ) : null}
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={`${entry.name} ${on ? "enabled" : "disabled"}`}
            onClick={() => onToggle(entry.name, !on)}
            className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
              on
                ? "justify-end bg-[var(--dt-brand)]"
                : "justify-start bg-neutral-300"
            }`}
            title={on ? "Enabled, click to disable" : "Disabled, click to enable"}
          >
            <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
          </button>
        </div>

        {/* The component itself, always visible: the card shows the component. */}
        {sample ? (
          <div className="mt-2">
            {entry.container ? (
              <C {...sample.props}>
                <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs">
                  one
                </span>
                <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs">
                  two
                </span>
              </C>
            ) : (
              <C {...sample.props} />
            )}
          </div>
        ) : null}

        {/* Reveal + Edit controls (the agent-read description lives behind these) */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          <button
            type="button"
            aria-expanded={isRevealed}
            onClick={() =>
              setRevealed((p) => ({ ...p, [entry.name]: !isRevealed }))
            }
            className="flex items-center gap-1 text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
          >
            <span aria-hidden>{isRevealed ? "▾" : "▸"}</span>
            <span aria-hidden>◉</span>
            what the agent sees
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing((p) => ({ ...p, [entry.name]: !isEditing }));
              setRevealed((p) => ({ ...p, [entry.name]: true }));
            }}
            className="text-[var(--muted)] underline-offset-2 transition-colors hover:text-[var(--ink)] hover:underline"
          >
            Edit
          </button>
          {edited ? (
            <button
              type="button"
              onClick={() => onDescriptionReset(entry.name)}
              className="text-[var(--faint)] underline-offset-2 transition-colors hover:text-[var(--ink)] hover:underline"
            >
              Reset
            </button>
          ) : null}
        </div>

        {/* Revealed: the description the agent reads (read-only or editor). */}
        {isRevealed ? (
          <div className="mt-2">
            {isEditing ? (
              <textarea
                value={descValue}
                onChange={(e) => onDescriptionChange(entry.name, e.target.value)}
                rows={3}
                aria-label={`${entry.name} description (the agent reads this)`}
                className="w-full resize-y rounded border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--muted)] focus:border-[var(--dt-brand)] focus:outline-none"
              />
            ) : (
              <p className="rounded border border-[var(--line)] bg-[var(--vellum)] px-2 py-1.5 text-xs text-[var(--muted)]">
                {descValue}
              </p>
            )}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex justify-end">
        <HonestyChip variant="hard">Hard · enforced</HonestyChip>
      </div>
      <p className="text-sm text-[var(--muted)]">
        Lever 1 of 3: catalog breadth. This is your design system as an
        allow-list. On Controlled and Declarative, turn a component off and the
        agent can no longer reach for it on the next run. Open-ended has no
        catalog, by design: that is what HIGH freedom means.
      </p>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto">
        <section>
          <div className={sectionLabel}>Basic</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {BASIC.map(renderCard)}
          </div>
        </section>
        <section>
          <div className={sectionLabel}>Structured</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {STRUCTURED.map(renderCard)}
          </div>
        </section>
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Coming soon: define a new component and add it to your catalog"
          className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--line)] bg-neutral-50 p-3 text-sm text-neutral-400"
        >
          <span aria-hidden className="text-base leading-none">
            +
          </span>
          <span>Add component</span>
          <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-neutral-500">
            Coming soon
          </span>
        </button>
      </div>
      <TeachingCard
        name="the Catalog"
        mechanism="A typed component registry. Toggle one off and it leaves the agent's vocabulary, and the renderer hard-rejects anything not on the list. The description is the prose the agent reads, so editing it steers what gets built."
        purpose="The catalog is your design space: on Controlled and Declarative it decides which components can appear, enforced in code, not merely requested. Open-ended lifts the catalog on purpose, the freedom-dial trade-off made real."
      />
    </div>
  );
}
