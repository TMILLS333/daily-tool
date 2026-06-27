"use client";

import { useMemo } from "react";
import { useFrontendTool } from "@copilotkit/react-core/v2";
import {
  CATALOG,
  catalogByName,
  toolNameFor,
  type CatalogEntry,
} from "@/lib/catalog";

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
  label,
  description,
  onBlock,
}: {
  entry: CatalogEntry;
  /**
   * The agent-facing name: the designer's edited label (the rename lever) when
   * present, else the built-in name. It drives the tool name + description the
   * agent reads, so renaming steers selection. The handler stays bound to the
   * built-in `entry.name`, so the renderer always resolves the real component
   * — a rename can misroute the agent but never break what paints.
   */
  label: string;
  /**
   * The agent-facing description: the designer's edited text when present,
   * else the build-time default. Single-sourcing this into the native tool
   * description means the agent no longer receives a competing build-time
   * description alongside the edited one (the two-channel fix; Controlled only).
   */
  description: string;
  onBlock: (block: StaticBlock) => void;
}) {
  useFrontendTool(
    {
      name: toolNameFor(label),
      description: `Add a ${label} to the interface, below everything already shown. ${description}`,
      parameters: entry.props,
      handler: async (args: Record<string, unknown>) => {
        onBlock({ component: entry.name, props: args });
        return `${label} rendered.`;
      },
    },
    [entry.name, label, description]
  );
  return null;
}

export function StaticPattern({
  blocks,
  onBlock,
  enabledNames,
  descriptions,
  labels,
}: {
  blocks: StaticBlock[];
  onBlock: (block: StaticBlock) => void;
  /** App truth: which components are currently enabled (Catalog tab). */
  enabledNames: Set<string>;
  /**
   * The designer's edited catalog descriptions (Catalog tab). The Controlled
   * tool description is built from these so the agent sees the designer's
   * description, not a competing build-time one.
   */
  descriptions: Record<string, string>;
  /**
   * The designer's edited component labels (the rename lever, Catalog tab).
   * The Controlled tool name + description are built from these so the agent
   * selects by the renamed vocabulary; the renderer still resolves by the
   * built-in name.
   */
  labels: Record<string, string>;
}) {
  // Flat, sequential tool-call entries: enabled, non-container catalog items.
  const entries = useMemo(
    () => CATALOG.filter((c) => !c.container && enabledNames.has(c.name)),
    [enabledNames]
  );

  return (
    <div className="flex flex-col" style={{ gap: "var(--dt-gap)" }}>
      {entries.map((entry) => {
        const edited = descriptions[entry.name];
        const description = edited && edited.trim() ? edited : entry.description;
        const editedLabel = labels[entry.name];
        const label =
          editedLabel && editedLabel.trim() ? editedLabel.trim() : entry.name;
        return (
          <ToolRegistration
            key={entry.name}
            entry={entry}
            label={label}
            description={description}
            onBlock={onBlock}
          />
        );
      })}

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
