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
export function LegibilityView({ agentText }: { agentText: string | null }) {
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
