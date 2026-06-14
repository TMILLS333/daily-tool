/**
 * The component catalog — the designer-owned vocabulary of this app.
 *
 * Every component the agent may use is registered here with:
 *   - a name and plain-language description (what the model reads),
 *   - a zod props schema (Gemini-safe: flat fields, no additionalProperties),
 *   - the React component that renders it.
 *
 * The Declarative pattern validates agent output against this registry:
 * a component that isn't here (or isn't enabled) does not render. That
 * enforcement IS the catalog concept.
 *
 * Pass 3a: the `enabled` flag is the DEFAULT seed. At runtime the Catalog tab
 * lifts enablement into React state and passes an `enabledNames` set into the
 * functions below; when a set is supplied it is the source of truth, when it
 * is omitted the static `enabled` defaults apply.
 */

import { z } from "zod";
import {
  DTBadge,
  DTButton,
  DTCard,
  DTHeading,
  DTList,
  DTPieChart,
  DTStack,
} from "@/components/catalog-primitives";

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export interface CatalogEntry {
  name: string;
  description: string;
  /** Flat zod schema for the component's props (Gemini-safe). */
  props: z.ZodTypeAny;
  /** Default enablement. The Catalog tab overrides this at runtime. */
  enabled: boolean;
  /** May contain child nodes in a declarative spec. */
  container?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Component: React.ComponentType<any>;
}

export const CATALOG: CatalogEntry[] = [
  {
    name: "Heading",
    description: "A section heading. Props: text (string), level (1, 2 or 3).",
    props: z.object({
      text: z.string(),
      level: z.number().min(1).max(3).optional(),
    }),
    enabled: true,
    Component: DTHeading,
  },
  {
    name: "Card",
    description:
      "A bordered card for one idea. Props: title (string), body (string), accent ('none' | 'brand').",
    props: z.object({
      title: z.string(),
      body: z.string(),
      accent: z.enum(["none", "brand"]).optional(),
    }),
    enabled: true,
    Component: DTCard,
  },
  {
    name: "Badge",
    description:
      "A small status label. Props: label (string), tone ('neutral' | 'success' | 'warning' | 'danger').",
    props: z.object({
      label: z.string(),
      tone: z.enum(["neutral", "success", "warning", "danger"]).optional(),
    }),
    enabled: true,
    Component: DTBadge,
  },
  {
    name: "List",
    description:
      "A short list of items. Props: title (string, optional), items (array of strings), ordered (boolean).",
    props: z.object({
      title: z.string().optional(),
      items: z.array(z.string()),
      ordered: z.boolean().optional(),
    }),
    enabled: true,
    Component: DTList,
  },
  {
    name: "Button",
    description:
      "A display-only action button. Props: label (string), intent ('primary' | 'secondary'). It does not perform actions in this version.",
    props: z.object({
      label: z.string(),
      intent: z.enum(["primary", "secondary"]).optional(),
    }),
    enabled: true,
    Component: DTButton,
  },
  {
    name: "Stack",
    description:
      "A layout container holding child components. Props: direction ('vertical' | 'horizontal'). Children go in the children array.",
    props: z.object({
      direction: z.enum(["vertical", "horizontal"]).optional(),
    }),
    enabled: true,
    container: true,
    Component: DTStack,
  },
  {
    name: "PieChart",
    description:
      "A pie chart summarizing parts of a whole. Props: title (string, optional), labels (array of strings), values (array of numbers, same length as labels). Off by default — enable it in the Catalog tab.",
    props: z.object({
      title: z.string().optional(),
      labels: z.array(z.string()),
      values: z.array(z.number()),
    }),
    enabled: false,
    Component: DTPieChart,
  },
];

/** Representative props for the Catalog tab's live samples. */
export const CATALOG_SAMPLES: Record<
  string,
  { props: Record<string, unknown>; childrenSample?: boolean }
> = {
  Heading: { props: { text: "Section heading", level: 2 } },
  Card: { props: { title: "Card title", body: "A short supporting line." , accent: "brand" } },
  Badge: { props: { label: "Accepting", tone: "success" } },
  List: { props: { title: "Checklist", items: ["First item", "Second item"], ordered: false } },
  Button: { props: { label: "Action", intent: "primary" } },
  Stack: { props: { direction: "horizontal" }, childrenSample: true },
  PieChart: { props: { title: "Sources", labels: ["A", "B", "C"], values: [50, 30, 20] } },
};

/** The set of component names enabled by default (seed for the Catalog tab). */
export const defaultEnabledNames = (): Set<string> =>
  new Set(CATALOG.filter((c) => c.enabled).map((c) => c.name));

export const enabledCatalog = (enabledNames?: Set<string>) =>
  CATALOG.filter((c) => (enabledNames ? enabledNames.has(c.name) : c.enabled));

export const catalogByName = (name: string) =>
  CATALOG.find((c) => c.name.toLowerCase() === name.toLowerCase());

/** Is this component enabled? Runtime set wins; otherwise the static default. */
function isEnabledName(name: string, enabledNames?: Set<string>): boolean {
  const entry = catalogByName(name);
  if (!entry) return false;
  return enabledNames ? enabledNames.has(entry.name) : entry.enabled;
}

/** Model-facing one-line-per-component catalog description. */
export const catalogPromptText = (enabledNames?: Set<string>) =>
  enabledCatalog(enabledNames)
    .map((c) => `- ${c.name}: ${c.description}`)
    .join("\n");

/**
 * The components the agent is actually allowed to use in a given pattern.
 * This is app truth, not a model claim — the why-panel renders this instead
 * of the model's self-report, which smaller models hallucinate (e.g. scout
 * inventing "HeadingCard"). Static drives flat show_* tools, so containers
 * aren't callable there; Declarative can nest, so the full enabled catalog
 * applies; Open-Ended has no catalog.
 */
export function allowedComponentNames(
  pattern: "static" | "declarative" | "open-ended",
  enabledNames?: Set<string>
): string[] {
  if (pattern === "open-ended") return [];
  const usable =
    pattern === "static"
      ? enabledCatalog(enabledNames).filter((c) => !c.container)
      : enabledCatalog(enabledNames);
  return usable.map((c) => c.name);
}

// ---------------------------------------------------------------------------
// Declarative spec ("A2UI-style", simplified)
// ---------------------------------------------------------------------------

export interface SpecNode {
  component: string;
  props?: Record<string, unknown>;
  children?: SpecNode[];
}

const specNodeSchema: z.ZodType<SpecNode> = z.lazy(() =>
  z.object({
    component: z.string(),
    props: z.record(z.unknown()).optional(),
    children: z.array(specNodeSchema).optional(),
  })
);

export const declarativeSpecSchema = z.object({
  version: z.literal("1").optional(),
  root: specNodeSchema,
});

export interface SpecValidation {
  /** Nodes that passed: component exists, is enabled, props parse. */
  ok: boolean;
  /** Human-readable problems, shown honestly in the UI. */
  problems: string[];
}

/** Walk a spec and validate every node against the enabled catalog. */
export function validateSpec(
  root: SpecNode,
  enabledNames?: Set<string>
): SpecValidation {
  const problems: string[] = [];
  const walk = (node: SpecNode, path: string) => {
    const entry = catalogByName(node.component);
    if (!entry) {
      problems.push(`${path}: "${node.component}" is not in the catalog — not rendered.`);
      return;
    }
    if (!isEnabledName(entry.name, enabledNames)) {
      problems.push(`${path}: "${node.component}" is disabled — not rendered.`);
      return;
    }
    const parsed = entry.props.safeParse(node.props ?? {});
    if (!parsed.success) {
      problems.push(
        `${path}: "${node.component}" has invalid props (${parsed.error.issues
          .map((i) => i.path.join(".") + " " + i.message)
          .join("; ")}) — not rendered.`
      );
    }
    for (const [i, child] of (node.children ?? []).entries()) {
      walk(child, `${path} > ${node.component}[${i}]`);
    }
  };
  walk(root, "root");
  return { ok: problems.length === 0, problems };
}

/** Render a validated spec tree using the catalog. Invalid nodes are skipped. */
export function CatalogRenderer({
  node,
  enabledNames,
}: {
  node: SpecNode;
  enabledNames?: Set<string>;
}) {
  const entry = catalogByName(node.component);
  if (!entry || !isEnabledName(entry.name, enabledNames)) return null;
  const parsed = entry.props.safeParse(node.props ?? {});
  if (!parsed.success) return null;
  const children = (node.children ?? []).map((child, i) => (
    <CatalogRenderer key={i} node={child} enabledNames={enabledNames} />
  ));
  const C = entry.Component;
  return entry.container ? <C {...parsed.data}>{children}</C> : <C {...parsed.data} />;
}

// ---------------------------------------------------------------------------
// Agent output parsing (fenced blocks + the "why" account)
// ---------------------------------------------------------------------------

/** Extract the first fenced block of a given language from model text. */
export function parseFencedBlock(text: string, lang: string): string | null {
  const re = new RegExp("```" + lang + "\\s*\\n([\\s\\S]*?)```", "i");
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

// Note: componentsAllowed is intentionally NOT in this schema. The app owns
// the allowed-components list (see allowedComponentNames); the model only
// reports the pattern, the rules it applied, and decisions it had to make.
// Extra keys a model emits are stripped by safeParse, so this stays tolerant.
export const whySchema = z.object({
  pattern: z.string(),
  rulesApplied: z.array(z.string()),
  notes: z.string().optional(),
});

export type WhyAccount = z.infer<typeof whySchema>;

/** Parse the agent's ```why block. Returns null when absent or malformed. */
export function parseWhy(text: string): WhyAccount | null {
  const block = parseFencedBlock(text, "why");
  if (!block) return null;
  try {
    const parsed = whySchema.safeParse(JSON.parse(block));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Model text with the machine blocks (why/json/html) stripped out. */
export function commentaryOf(text: string): string {
  return text
    .replace(/```(why|json|html)\s*\n[\s\S]*?```/gi, "")
    .trim();
}
