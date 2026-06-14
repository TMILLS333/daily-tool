"use client";

import { useMemo } from "react";
import { useFrontendTool } from "@copilotkit/react-core/v2";
import { CATALOG, catalogByName, type CatalogEntry } from "@/lib/catalog";

/**
 * Static pattern — the designer pre-built the components; the agent picks
 * and fills them via tool calls (one show_* tool per catalog component).
 *
 * The tools are registered only while this component is mounted, i.e. only
 * while the Static tab is active — the agent never sees them on the other
 * patterns. Pass 3a: the set of registered tools is now reactive to the
 * Catalog tab — disabling a component unmounts its ToolRegistration, so the
 * agent can no longer call it on the next run.
 */

export interface StaticBlock {
  component: string;
  props: Record<string, unknown>;
}

function ToolRegistration({
  entry,
  onBlock,
}: {
  entry: CatalogEntry;
  onBlock: (block: StaticBlock) => void;
}) {
  useFrontendTool(
    {
      name: `show_${entry.name.toLowerCase()}`,
      description: `Add a ${entry.name} to the interface, below everything already shown. ${entry.description}`,
      parameters: entry.props,
      handler: async (args: Record<string, unknown>) => {
        onBlock({ component: entry.name, props: args });
        return `${entry.name} rendered.`;
      },
    },
    [entry.name]
  );
  return null;
}

export function StaticPattern({
  blocks,
  onBlock,
  enabledNames,
}: {
  blocks: StaticBlock[];
  onBlock: (block: StaticBlock) => void;
  /** App truth: which components are currently enabled (Catalog tab). */
  enabledNames: Set<string>;
}) {
  // Flat, sequential tool-call entries: enabled, non-container catalog items.
  const entries = useMemo(
    () => CATALOG.filter((c) => !c.container && enabledNames.has(c.name)),
    [enabledNames]
  );

  return (
    <div className="flex flex-col" style={{ gap: "var(--dt-gap)" }}>
      {entries.map((entry) => (
        <ToolRegistration key={entry.name} entry={entry} onBlock={onBlock} />
      ))}

      {blocks.length === 0 ? (
        <p className="text-sm text-neutral-400">
          Nothing rendered yet. The agent builds this area by calling your
          pre-built components, one at a time, top to bottom.
        </p>
      ) : (
        blocks.map((block, i) => {
          const entry = catalogByName(block.component);
          if (!entry) return null;
          const parsed = entry.props.safeParse(block.props);
          if (!parsed.success) return null;
          const C = entry.Component;
          return <C key={i} {...parsed.data} />;
        })
      )}
    </div>
  );
}
