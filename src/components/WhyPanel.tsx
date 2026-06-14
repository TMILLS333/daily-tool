"use client";

import type { WhyAccount } from "@/lib/catalog";

/**
 * The why-panel. Two sources, kept honest and distinct:
 *   - Pattern, rules applied, and decisions are the model's own account.
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
  return (
    <aside className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">Why this render</h2>
        <span className="text-xs text-neutral-400">
          the model&apos;s own account of rules and decisions
        </span>
      </div>

      {!why ? (
        <p className="mt-2 text-sm text-neutral-500">
          Run a request and the agent reports here: the pattern it used, the
          rules it applied, and the components it was allowed to touch.
        </p>
      ) : (
        <dl className="mt-3 space-y-3 text-sm">
          <div>
            <dt className="font-medium text-neutral-700">Pattern</dt>
            <dd className="text-neutral-600">{why.pattern}</dd>
          </div>
          <div>
            <dt className="font-medium text-neutral-700">Rules applied</dt>
            <dd>
              {why.rulesApplied.length === 0 ? (
                <span className="text-neutral-500">none reported</span>
              ) : (
                <ul className="mt-1 list-disc space-y-1 pl-5 text-neutral-600">
                  {why.rulesApplied.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              )}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-neutral-700">
              Components allowed{" "}
              <span className="font-normal text-neutral-400">
                (from your catalog, not the model)
              </span>
            </dt>
            <dd className="mt-1 flex flex-wrap gap-1">
              {componentsAllowed.length === 0 ? (
                <span className="text-neutral-500">
                  none — no catalog in this pattern, only your rules
                </span>
              ) : (
                componentsAllowed.map((c, i) => (
                  <code
                    key={i}
                    className="rounded bg-white px-1.5 py-0.5 text-xs text-neutral-700 ring-1 ring-neutral-200"
                  >
                    {c}
                  </code>
                ))
              )}
            </dd>
          </div>
          {why.notes ? (
            <div>
              <dt className="font-medium text-neutral-700">
                Decisions the rules didn&apos;t cover
              </dt>
              <dd className="text-neutral-600">{why.notes}</dd>
            </div>
          ) : null}
        </dl>
      )}
    </aside>
  );
}
