"use client";

import { useState, type ReactNode } from "react";

/**
 * Shared teaching chrome for the authoring surfaces (Slice 2b).
 *
 * HonestyChip is a small status tag naming how a lever actually behaves
 * (soft/instructed vs hard/enforced vs agent-invisible). TeachingCard is the
 * "How X works" footer card: name -> mechanism -> purpose. Both are inert
 * presentation: they describe what is true about the architecture, they do not
 * change it.
 *
 * `collapsible` (Pass 3, opt-in) renders a subtle closed-by-default disclosure
 * instead of the always-open card. The default (always-open) behavior is
 * unchanged, so callers that don't pass it are untouched.
 */

type ChipVariant = "soft" | "hard" | "invisible";

const CHIP_STYLES: Record<ChipVariant, string> = {
  soft: "bg-amber-100 text-amber-800",
  hard: "bg-[var(--petrol)] text-white",
  invisible: "bg-neutral-200 text-neutral-500",
};

export function HonestyChip({
  variant,
  children,
}: {
  variant: ChipVariant;
  children: ReactNode;
}) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${CHIP_STYLES[variant]}`}
    >
      {children}
    </span>
  );
}

export function TeachingCard({
  name,
  mechanism,
  purpose,
  collapsible = false,
}: {
  name: string;
  mechanism: ReactNode;
  purpose: ReactNode;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const body = (
    <>
      <p className="mb-1">
        <span className="font-medium text-neutral-500">Mechanism. </span>
        {mechanism}
      </p>
      <p>
        <span className="font-medium text-neutral-500">Purpose. </span>
        {purpose}
      </p>
    </>
  );

  // Opt-in subtle disclosure (Pass 3): closed by default, muted, no card chrome.
  if (collapsible) {
    return (
      <section className="mt-3 shrink-0 text-xs leading-relaxed text-neutral-600">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-1.5 text-neutral-400 transition-colors hover:text-neutral-600"
        >
          <svg
            viewBox="0 0 12 12"
            className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path
              d="M4.5 3l3 3-3 3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          How {name} works
        </button>
        {open && (
          <div className="mt-2 border-l border-[var(--line)] pl-3">{body}</div>
        )}
      </section>
    );
  }

  return (
    <section className="mt-3 shrink-0 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 text-xs leading-relaxed text-neutral-600">
      <div className="mb-1 font-semibold text-neutral-700">How {name} works</div>
      {body}
    </section>
  );
}
