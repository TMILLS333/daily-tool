"use client";

import {
  declarativeSpecSchema,
  parseFencedBlock,
  type SpecNode,
} from "@/lib/catalog";

/**
 * Legibility view — the operations the agent ALREADY emitted, surfaced.
 *
 * Display only. It re-parses the same response text the Declarative pattern
 * renders (the JSON spec), then shows the two things the app otherwise throws
 * away after rendering: the component TREE (structure) and the data BINDINGS
 * (each prop path -> value), the way the AG-UI Dojo's expandable tool-call
 * shows ARGUMENTS + RESULT.
 *
 * It runs no agent loop and shares no state with DeclarativePattern — it
 * derives everything from `agentText`, so it works on a fixed, pre-staged
 * response with no live run. That is what makes it flake-proof for a live
 * room: the thesis ("the catalog is the design space") is shown, not computed.
 *
 * Path notation mirrors validateSpec exactly (`root`, then
 * `root > Stack[0] > Card[1]`), so a node here reads the same as its rejection
 * message in the Declarative pattern.
 */
export function LegibilityView({
  agentText,
  ops,
}: {
  agentText: string | null;
  /**
   * Real A2UI operations (Pass C). When present, the view reads the emitted
   * ops directly instead of the json-spec text path. Real A2UI emits operations
   * (createSurface / updateComponents / updateDataModel), not a json spec, so on
   * the real-A2UI Declarative path this is the source. Absent (simplified path)
   * leaves the json-spec behavior below byte-for-byte unchanged.
   */
  ops?: ReadonlyArray<Record<string, unknown>> | null;
}) {
  if (ops && ops.length > 0) {
    return <OpsView ops={ops} />;
  }
  if (!agentText) {
    return (
      <Frame>
        <Note>
          Nothing emitted yet. Run a Declarative request and the operations the
          agent produced appear here.
        </Note>
      </Frame>
    );
  }

  const raw = parseFencedBlock(agentText, "json");
  if (!raw) {
    return (
      <Frame>
        <Note>
          No spec block in the response. The legibility view reads the JSON spec
          the agent emits; there is nothing to show yet.
        </Note>
      </Frame>
    );
  }

  let spec: unknown;
  try {
    spec = JSON.parse(raw);
  } catch {
    return (
      <Frame>
        <Note>The emitted spec is not valid JSON, so its operations cannot be read.</Note>
      </Frame>
    );
  }

  const parsed = declarativeSpecSchema.safeParse(spec);
  if (!parsed.success) {
    return (
      <Frame>
        <Note>
          The emitted spec has the wrong shape:{" "}
          {parsed.error.issues.map((i) => i.message).join("; ")}
        </Note>
      </Frame>
    );
  }

  return (
    <Frame>
      <SpecNodeRow node={parsed.data.root} path="root" depth={0} />
    </Frame>
  );
}

/** The panel shell — quiet band that matches the why-strip, never competes. */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--dt-radius)] border border-[var(--line)] px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-[var(--faint)]">
        Operations{" "}
        <span className="normal-case text-[var(--faint)]">
          — the component tree and data bindings the agent emitted
        </span>
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[var(--faint)]">{children}</p>;
}

/**
 * One node of the emitted spec, rendered as a collapsible row. The summary is
 * the STRUCTURE (component name, its path, and counts); expanding reveals the
 * BINDINGS (prop path -> value). Children recurse, indented. Default open so
 * the tree reads at a glance; the disclosure is the reveal affordance.
 */
function SpecNodeRow({
  node,
  path,
  depth,
}: {
  node: SpecNode;
  path: string;
  depth: number;
}) {
  const propEntries = Object.entries(node.props ?? {});
  const children = node.children ?? [];

  return (
    <details
      open
      className="group border-l border-[var(--line)] pl-3"
      style={{ marginLeft: depth ? "var(--dt-gap)" : 0, marginTop: depth ? "6px" : 0 }}
    >
      <summary className="flex cursor-pointer list-none items-baseline gap-2">
        <span
          className="inline-block text-[10px] text-[var(--faint)] transition-transform group-open:rotate-90"
          aria-hidden
        >
          ▸
        </span>
        <span className="font-serif text-[15px] text-[var(--ink)]">
          {node.component}
        </span>
        <span className="font-mono text-[11px] text-[var(--faint)]">{path}</span>
        <span className="text-[11px] text-[var(--faint)]">
          {propEntries.length} {propEntries.length === 1 ? "binding" : "bindings"}
          {children.length > 0
            ? ` · ${children.length} ${children.length === 1 ? "child" : "children"}`
            : ""}
        </span>
      </summary>

      <div className="mt-1">
        {propEntries.length === 0 ? (
          <div className="font-mono text-xs text-[var(--faint)]">no bindings</div>
        ) : (
          <ul className="space-y-0.5">
            {propEntries.map(([key, value]) => (
              <li key={key} className="font-mono text-xs leading-relaxed">
                <span className="text-[var(--muted)]">
                  {path}.{key}
                </span>
                <span className="text-[var(--faint)]"> → </span>
                <span className="text-[var(--ink)]">{formatValue(value)}</span>
              </li>
            ))}
          </ul>
        )}

        {children.map((child, i) => (
          <SpecNodeRow
            key={i}
            node={child}
            path={`${path} > ${node.component}[${i}]`}
            depth={depth + 1}
          />
        ))}
      </div>
    </details>
  );
}

/** Honest, compact value rendering for a bound prop (string, number, array). */
function formatValue(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/* ---------- Real A2UI operations path (Pass C) -------------------------------
 *
 * Real A2UI emits operations, not a json spec: createSurface / updateComponents
 * / updateDataModel. A component is `{ id, component, ...properties }` where
 * `component` is its catalog type; containers list their children by id under
 * `childIds`. We reconstruct that flat, by-id model into the SAME SpecNode tree
 * the simplified path uses, so the existing SpecNodeRow renders both identically.
 * Pure presentation of the ops already in hand — no agent loop, can't flake.
 */

/**
 * A2UI containers reference their children by id. The runtime/agent schema uses
 * the key `children`; the catalog file historically documented `childIds`.
 * Accept either, and treat ONLY those keys as structural so a data array
 * (List.items, PieChart.labels) is never mistaken for children.
 */
const A2UI_CHILD_KEYS = ["children", "childIds"];

/** The child component ids a component points to, in order (empty if a leaf). */
function childIdsOf(props: Record<string, unknown>): string[] {
  for (const key of A2UI_CHILD_KEYS) {
    const value = props[key];
    if (Array.isArray(value)) {
      const ids = value.filter((c): c is string => typeof c === "string");
      if (ids.length > 0) return ids;
    }
  }
  return [];
}

/** A component's data bindings: its props minus the structural child-id keys. */
function bindingsOf(props: Record<string, unknown>): Record<string, unknown> {
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!A2UI_CHILD_KEYS.includes(key)) rest[key] = value;
  }
  return rest;
}

function OpsView({ ops }: { ops: ReadonlyArray<Record<string, unknown>> }) {
  const { root, dataModel } = buildOpsTree(ops);
  if (!root) {
    return (
      <Frame>
        <Note>The run emitted operations, but no components to display yet.</Note>
      </Frame>
    );
  }
  return (
    <Frame>
      <SpecNodeRow node={root} path="root" depth={0} />
      {dataModel.length > 0 ? (
        <div className="mt-3 border-t border-[var(--line)] pt-2">
          <div className="text-[11px] uppercase tracking-wide text-[var(--faint)]">
            Data model{" "}
            <span className="normal-case text-[var(--faint)]">(path → value)</span>
          </div>
          <ul className="mt-1 space-y-0.5">
            {dataModel.map((d, i) => (
              <li key={i} className="font-mono text-xs leading-relaxed">
                <span className="text-[var(--muted)]">{d.path}</span>
                <span className="text-[var(--faint)]"> → </span>
                <span className="text-[var(--ink)]">{formatValue(d.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Frame>
  );
}

/**
 * Fold the emitted ops into a SpecNode tree + the data model. Components
 * accumulate by id (a later op updating an earlier one, last write wins, as the
 * A2UI message processor does); the tree is resolved from "root" (or, if absent,
 * the first component nothing else references). Cycles and dangling child ids are
 * rendered as a labeled node rather than throwing — the reveal must never break.
 */
function buildOpsTree(ops: ReadonlyArray<Record<string, unknown>>): {
  root: SpecNode | null;
  dataModel: { path: string; value: unknown }[];
} {
  const comps = new Map<string, { type: string; props: Record<string, unknown> }>();
  const dataModel: { path: string; value: unknown }[] = [];

  for (const op of ops) {
    const uc = (op as Record<string, any>).updateComponents;
    if (uc && Array.isArray(uc.components)) {
      for (const comp of uc.components as Record<string, unknown>[]) {
        if (!comp || typeof comp !== "object") continue;
        const { id, component, ...props } = comp;
        if (typeof id !== "string") continue;
        const prior = comps.get(id);
        const type =
          typeof component === "string" ? component : prior?.type ?? "Unknown";
        comps.set(id, { type, props });
      }
    }
    const dm = (op as Record<string, any>).updateDataModel;
    if (dm && typeof dm === "object" && "value" in dm) {
      dataModel.push({
        path: typeof dm.path === "string" ? dm.path : "/",
        value: dm.value,
      });
    }
  }

  if (comps.size === 0) return { root: null, dataModel };

  const referenced = new Set<string>();
  for (const { props } of comps.values()) {
    for (const id of childIdsOf(props)) referenced.add(id);
  }
  const rootId = comps.has("root")
    ? "root"
    : [...comps.keys()].find((id) => !referenced.has(id)) ?? [...comps.keys()][0];

  const toNode = (id: string, seen: Set<string>): SpecNode => {
    const comp = comps.get(id);
    if (!comp) return { component: `missing: ${id}` };
    if (seen.has(id)) return { component: `${comp.type} (cycle)` };
    const next = new Set(seen).add(id);
    const childIds = childIdsOf(comp.props);
    const children =
      childIds.length > 0 ? childIds.map((c) => toNode(c, next)) : undefined;
    return { component: comp.type, props: bindingsOf(comp.props), children };
  };

  return { root: toNode(rootId, new Set<string>()), dataModel };
}
