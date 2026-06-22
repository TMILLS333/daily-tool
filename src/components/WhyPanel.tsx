"use client";

import type { WhyAccount } from "@/lib/catalog";
import { HonestyChip } from "@/components/TeachingCard";

/**
 * The why-strip — a quiet band beneath the rendered output, split by PROVENANCE
 * so the demo never blurs a guarantee with a claim:
 *   - "Computed by the app" (verified): the active pattern, the AI-freedom level,
 *     and the components allowed (allowedComponentNames) — app truth, not a model
 *     claim. Small models hallucinate their own catalog, so this is enforced.
 *   - "Reported by the model" (the agent's account): rules applied, intent,
 *     structure, drawn-from, notes — the model's self-report, which can be wrong.
 * On the Real A2UI path the agent emits operations and no written why-account, so
 * the model zone is replaced by an honest note rather than empty fields.
 */
export function WhyPanel({
  why,
  componentsAllowed,
  freedom,
  pattern,
  realPath,
}: {
  why: WhyAccount | null;
  /** App truth: components actually allowed in this pattern, not a model claim. */
  componentsAllowed: string[];
  /** App-derived AI-freedom level for the active pattern (Low / Medium / High). */
  freedom: string;
  /** Active pattern from app state — authoritative, NOT the model's why.pattern. */
  pattern: string;
  /** True when the active render path is real A2UI (no written model account). */
  realPath: boolean;
}) {
  const label = "text-[11px] uppercase tracking-wide text-[var(--faint)]";

  // Pre-run on the simplified path: the quiet prompt. (The real path always has
  // app-truth to show, so it skips the placeholder.)
  if (!why && !realPath) {
    return (
      <aside className="rounded-[var(--dt-radius)] border border-[var(--line)] px-4 py-3">
        <p className="text-sm text-[var(--faint)]">
          <span className="font-medium text-[var(--muted)]">Why this render</span>{" "}
          — run a request and the agent reports the pattern it used, the rules it
          applied, and the components it was allowed to touch.
        </p>
      </aside>
    );
  }

  const patternName = pattern === "static" ? "Controlled" : pattern;

  return (
    <aside className="flex flex-col gap-3 rounded-[var(--dt-radius)] border border-[var(--line)] px-4 py-3">
      {/* Computed by the app — verified, not a model claim. */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[12px] font-medium text-[var(--ink)]">
            Computed by the app
          </span>
          <HonestyChip variant="hard">Verified</HonestyChip>
        </div>
        <div className="flex flex-wrap gap-x-10 gap-y-3">
          <div>
            <div className={label}>Pattern</div>
            <div className="font-serif text-[15px] capitalize">{patternName}</div>
            <div className="mt-0.5 text-[11px] text-[var(--faint)]">
              {freedom} AI freedom
            </div>
          </div>
          <div className="min-w-0">
            <div className={label}>
              Components allowed{" "}
              <span className="normal-case text-[var(--faint)]">
                (from your catalog)
              </span>
            </div>
            <div className="text-sm text-[var(--ink)]">
              {componentsAllowed.length === 0 ? (
                <span className="text-[var(--faint)]">none — rules only</span>
              ) : (
                componentsAllowed.join(" · ")
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reported by the model — the agent's own account (can be wrong). On the
          real A2UI path there is no written account, so an honest note replaces it. */}
      <div className="border-t border-[var(--line)] pt-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[12px] font-medium text-[var(--ink)]">
            Reported by the model
          </span>
          <HonestyChip variant="soft">Agent&apos;s account</HonestyChip>
        </div>
        {realPath ? (
          <p className="text-sm text-[var(--muted)]">
            On the Real A2UI path the agent emits operations, not a written
            account — see the Operations module above for exactly what it built.
          </p>
        ) : (
          <div className="flex flex-col gap-2 text-sm text-[var(--muted)]">
            <div>
              <span className="text-[var(--faint)]">Rules fired: </span>
              {!why || why.rulesApplied.length === 0 ? (
                <span className="text-[var(--faint)]">none reported</span>
              ) : (
                <span className="text-[var(--ink)]">
                  {why.rulesApplied.join(" · ")}
                </span>
              )}
            </div>
            {why?.intent ? (
              <div>
                <span className="text-[var(--faint)]">Intent: </span>
                {why.intent}
              </div>
            ) : null}
            {why?.structure ? (
              <div>
                <span className="text-[var(--faint)]">Structure inferred: </span>
                {why.structure}
              </div>
            ) : null}
            {why?.source ? (
              <div>
                <span className="text-[var(--faint)]">Drawn from: </span>
                {why.source}
              </div>
            ) : null}
            {why?.notes ? (
              <div>
                <span className="text-[var(--faint)]">
                  Decisions the rules didn&apos;t cover:{" "}
                </span>
                {why.notes}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </aside>
  );
}
