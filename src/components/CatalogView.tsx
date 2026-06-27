"use client";

import { CATALOG } from "@/lib/catalog";

/**
 * Catalog view: the reveal's "what could the agent reach for" facet.
 *
 * Display only. It lists the catalog (the agent's allowed vocabulary) and marks
 * two things the render otherwise leaves implicit: which entries are enabled
 * (the Catalog tab's allow-list) and which the CURRENT render actually used
 * (derived by the page from the emitted spec for Declarative, or the rendered
 * blocks for Controlled). It changes nothing; authoring still lives in the
 * Catalog tab. This is the catalog made legible next to the render.
 */
export function CatalogView({
  enabledNames,
  usedNames,
}: {
  enabledNames: Set<string>;
  /** Components the current render used (app-derived, not a model claim). */
  usedNames: Set<string>;
}) {
  return (
    <section className="rounded-[var(--dt-radius)] border border-[var(--line)] px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-[var(--faint)]">
        Catalog{" "}
        <span className="normal-case text-[var(--faint)]">
          (the vocabulary the agent could reach for, and what this render used)
        </span>
      </div>
      <ul className="mt-2 space-y-1.5">
        {CATALOG.map((entry) => {
          const enabled = enabledNames.has(entry.name);
          const used = usedNames.has(entry.name);
          return (
            <li
              key={entry.name}
              className="border-l pl-3"
              style={{ borderColor: used ? "var(--petrol)" : "var(--line)" }}
            >
              <div className="flex items-baseline gap-2">
                <span
                  className="font-serif text-[15px]"
                  style={{ color: used ? "var(--petrol)" : "var(--ink)" }}
                >
                  {entry.name}
                </span>
                {used ? (
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                    style={{
                      background: "var(--petrol)",
                      color: "#fff",
                    }}
                  >
                    used
                  </span>
                ) : null}
                {!enabled ? (
                  <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-[var(--muted)]">
                    off
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs leading-snug text-[var(--muted)]">
                {entry.description}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
