"use client";

import type { WhyAccount } from "@/lib/catalog";

/**
 * The why-strip — a quiet band beneath the rendered output (the output is the
 * focal point; this explains it without competing). Two sources, kept honest:
 *   - Pattern and rules applied are the model's own account.
 *   - Components allowed is app truth (allowedComponentNames), passed in as a
 *     prop, NOT the model's self-report — small models hallucinate that list.
 */
export function WhyPanel({
  why,
  componentsAllowed,
}: {
  why: WhyAccount | null;
  /** App truth: components actually allowed in this pattern, not a model claim. */
  componentsAllowed: string[];
}) {
  const label = "text-[11px] uppercase tracking-wide text-[var(--faint)]";

  return (
    <aside className="rounded-[var(--dt-radius)] border border-[var(--line)] px-4 py-3">
      {!why ? (
        <p className="text-sm text-[var(--faint)]">
          <span className="font-medium text-[var(--muted)]">Why this render</span>{" "}
          — run a request and the agent reports the pattern it used, the rules it
          applied, and the components it was allowed to touch.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-x-10 gap-y-3">
            <div>
              <div className={label}>Pattern</div>
              {/* The model still reports the legacy key "static" in its
                  why-account; show the current name, Controlled. */}
              <div className="font-serif text-[15px] capitalize">
                {why.pattern === "static" ? "Controlled" : why.pattern}
              </div>
            </div>
            <div className="min-w-0">
              <div className={label}>Rules fired</div>
              <div className="text-sm text-[var(--ink)]">
                {why.rulesApplied.length === 0
                  ? <span className="text-[var(--faint)]">none reported</span>
                  : why.rulesApplied.join(" · ")}
              </div>
            </div>
            <div className="min-w-0">
              <div className={label}>
                Components allowed{" "}
                <span className="normal-case text-[var(--faint)]">(from your catalog)</span>
              </div>
              <div className="text-sm text-[var(--ink)]">
                {componentsAllowed.length === 0
                  ? <span className="text-[var(--faint)]">none — rules only</span>
                  : componentsAllowed.join(" · ")}
              </div>
            </div>
          </div>
          {why.notes ? (
            <div className="mt-3 border-t border-[var(--line)] pt-2 text-sm text-[var(--muted)]">
              <span className="text-[var(--faint)]">Decisions the rules didn&apos;t cover: </span>
              {why.notes}
            </div>
          ) : null}
        </>
      )}
    </aside>
  );
}
