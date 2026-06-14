"use client";

import {
  CatalogRenderer,
  declarativeSpecSchema,
  parseFencedBlock,
  validateSpec,
} from "@/lib/catalog";

/**
 * Declarative pattern — the agent emits a JSON spec; a trusted renderer
 * assembles it from the catalog. Labeled "A2UI-style" because it is a
 * simplified stand-in for the real A2UI protocol. (Guardrail, research
 * 2026-06-13: do NOT swap in real A2UI before the June 27 workshop — A2UI is
 * v0.9 Public Preview and unstable. See research-genui-stack-and-patent doc.)
 *
 * Catalog enforcement is visible on purpose: nodes that name unknown OR
 * disabled components are rejected and listed, not silently dropped. With
 * Pass 3a, disabling a component in the Catalog tab makes its nodes reject
 * here — that rejection is the lesson.
 */
export function DeclarativePattern({
  agentText,
  enabledNames,
}: {
  agentText: string | null;
  /** App truth: which components are currently enabled (Catalog tab). */
  enabledNames: Set<string>;
}) {
  if (!agentText) {
    return (
      <p className="text-sm text-neutral-400">
        Nothing rendered yet. The agent emits a UI spec; your catalog decides
        what actually renders.
      </p>
    );
  }

  const raw = parseFencedBlock(agentText, "json");
  if (!raw) {
    return (
      <Problem
        title="No spec found"
        detail="The agent's response did not contain a JSON spec block. Run again — small models occasionally skip the format."
      />
    );
  }

  let spec: unknown;
  try {
    spec = JSON.parse(raw);
  } catch {
    return (
      <Problem
        title="Spec is not valid JSON"
        detail="The agent emitted a malformed spec. Run again."
      />
    );
  }

  const parsed = declarativeSpecSchema.safeParse(spec);
  if (!parsed.success) {
    return (
      <Problem
        title="Spec has the wrong shape"
        detail={parsed.error.issues.map((i) => i.message).join("; ")}
      />
    );
  }

  const validation = validateSpec(parsed.data.root, enabledNames);

  return (
    <div className="flex flex-col" style={{ gap: "var(--dt-gap)" }}>
      <span className="self-start rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500">
        A2UI-style (simplified catalog renderer)
      </span>

      <CatalogRenderer node={parsed.data.root} enabledNames={enabledNames} />

      {!validation.ok ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="text-xs font-semibold text-amber-800">
            Catalog enforcement — rejected by your component vocabulary
          </div>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-amber-700">
            {validation.problems.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Problem({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
      <div className="font-semibold text-amber-800">{title}</div>
      <div className="mt-0.5 text-amber-700">{detail}</div>
    </div>
  );
}
