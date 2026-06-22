"use client";

import type { ReactNode } from "react";

/**
 * Shared teaching chrome for the authoring surfaces (Slice 2b).
 *
 * HonestyChip is a small status tag naming how a lever actually behaves
 * (soft/instructed vs hard/enforced vs agent-invisible). TeachingCard is the
 * "How X works" footer card: name -> mechanism -> purpose. Both are inert
 * presentation: they describe what is true about the architecture, they do not
 * change it.
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
}: {
  name: string;
  mechanism: ReactNode;
  purpose: ReactNode;
}) {
  return (
    <section className="mt-3 shrink-0 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 text-xs leading-relaxed text-neutral-600">
      <div className="mb-1 font-semibold text-neutral-700">How {name} works</div>
      <p className="mb-1">
        <span className="font-medium text-neutral-500">Mechanism. </span>
        {mechanism}
      </p>
      <p>
        <span className="font-medium text-neutral-500">Purpose. </span>
        {purpose}
      </p>
    </section>
  );
}
