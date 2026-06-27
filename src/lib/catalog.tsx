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
  DTCardWithImage,
  DTDivider,
  DTFootnote,
  DTHeading,
  DTHighlight,
  DTIcon,
  DTIconCard,
  DTImage,
  DTKanban,
  DTList,
  DTMatrix,
  DTPieChart,
  DTProductCard,
  DTStack,
  DTStatCard,
  DTTable,
  DTText,
  DTTimeline,
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
    enabled: false,
    Component: DTHeading,
  },
  {
    name: "Highlight",
    description:
      "Prominent, emphasized text. Use for the single most important line you want to stand out. Props: text (string).",
    props: z.object({ text: z.string() }),
    enabled: false,
    Component: DTHighlight,
  },
  {
    name: "Footnote",
    description:
      "Small, muted fine print. Use for disclaimers, captions, or secondary detail. Props: text (string).",
    props: z.object({ text: z.string() }),
    enabled: false,
    Component: DTFootnote,
  },
  {
    name: "Text",
    description:
      "A paragraph of body text for sentences and supporting copy, as opposed to a Heading title. Props: text (string), tone ('default' | 'muted').",
    props: z.object({
      text: z.string(),
      tone: z.enum(["default", "muted"]).optional(),
    }),
    enabled: false,
    Component: DTText,
  },
  {
    name: "Card",
    description:
      "A bordered card. Props: title (string, optional), body (string, optional), accent ('none' | 'brand'). It can hold child components (for example an Image, Heading and Badge) to compose a richer card.",
    props: z.object({
      title: z.string().optional(),
      body: z.string().optional(),
      accent: z.enum(["none", "brand"]).optional(),
    }),
    enabled: false,
    container: true,
    Component: DTCard,
  },
  {
    name: "Badge",
    description:
      "A small status label. Props: label (string), tone ('neutral' | 'success' | 'warning' | 'danger'), category (optional number 1-6 to color-code by data category from the Theme palette; when set it overrides tone).",
    props: z.object({
      label: z.string(),
      tone: z.enum(["neutral", "success", "warning", "danger"]).optional(),
      category: z.number().int().min(1).max(6).optional(),
    }),
    enabled: false,
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
    enabled: false,
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
    enabled: false,
    Component: DTButton,
  },
  {
    name: "Image",
    description:
      "An image or photo. Props: alt (string, a short description), src (string, optional URL). Set src ONLY if the user's data contains a real image URL; never invent one. With no real src it shows a captioned placeholder.",
    props: z.object({
      alt: z.string(),
      src: z.string().optional(),
    }),
    enabled: false,
    Component: DTImage,
  },
  {
    name: "Icon",
    description:
      "A small glyph for emphasis or status. Props: name (one of 'check', 'info', 'warning', 'star', 'calendar', 'dot', 'arrow-right'), label (string, optional, for accessibility).",
    props: z.object({
      name: z.enum([
        "check",
        "info",
        "warning",
        "star",
        "calendar",
        "dot",
        "arrow-right",
      ]),
      label: z.string().optional(),
    }),
    enabled: false,
    Component: DTIcon,
  },
  {
    name: "Divider",
    description: "A thin horizontal rule that separates sections. No props.",
    props: z.object({}),
    enabled: false,
    Component: DTDivider,
  },
  {
    name: "Stack",
    description:
      "A layout container holding child components. Props: direction ('vertical' | 'horizontal'). Children go in the children array.",
    props: z.object({
      direction: z.enum(["vertical", "horizontal"]).optional(),
    }),
    enabled: false,
    container: true,
    Component: DTStack,
  },
  {
    name: "CardWithImage",
    description:
      "A card with an image on top and a title and caption below. Props: title (string), caption (string, optional), alt (string, a short image description), src (string, optional URL). Set src ONLY if the data has a real image URL; never invent one. With no real src it shows an honest captioned placeholder, so the card always renders. Prefer this over a bare Image when you want an image card.",
    props: z.object({
      title: z.string(),
      caption: z.string().optional(),
      alt: z.string(),
      src: z.string().optional(),
    }),
    enabled: false,
    Component: DTCardWithImage,
  },
  {
    name: "ProductCard",
    description:
      "A product card: an image, a title, a right-aligned price, and an optional meta line. Props: title (string), price (string, e.g. '$49'), meta (string, optional), alt (string, optional image description), src (string, optional URL; never invent one — a placeholder shows when absent).",
    props: z.object({
      title: z.string(),
      price: z.string(),
      meta: z.string().optional(),
      alt: z.string().optional(),
      src: z.string().optional(),
    }),
    enabled: false,
    Component: DTProductCard,
  },
  {
    name: "StatCard",
    description:
      "A single statistic: a large right-aligned figure with a label and optional unit and trend. Props: label (string), value (string, the figure, e.g. '128'), unit (string, optional, e.g. '%'), trend ('up' | 'down' | 'flat', optional). Use for a key number drawn from the data; do not invent figures.",
    props: z.object({
      label: z.string(),
      value: z.string(),
      unit: z.string().optional(),
      trend: z.enum(["up", "down", "flat"]).optional(),
    }),
    enabled: false,
    Component: DTStatCard,
  },
  {
    name: "IconCard",
    description:
      "A small card with an icon, a label, and an optional value. Props: icon (one of 'check', 'info', 'warning', 'star', 'calendar', 'dot', 'arrow-right'), label (string), value (string, optional). Good for category callouts or labelled facts.",
    props: z.object({
      icon: z.enum([
        "check",
        "info",
        "warning",
        "star",
        "calendar",
        "dot",
        "arrow-right",
      ]),
      label: z.string(),
      value: z.string().optional(),
    }),
    enabled: false,
    Component: DTIconCard,
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
  {
    name: "Table",
    description:
      "A data table for items that share the same fields. Props: columns (array of column-header strings), rows (array of rows, each row an array of cell strings in the same order as columns), caption (string, optional). Use when the data has consistent fields across many items. Off by default.",
    props: z.object({
      columns: z.array(z.string()),
      rows: z.array(z.array(z.string())),
      caption: z.string().optional(),
    }),
    enabled: false,
    Component: DTTable,
  },
  {
    name: "Timeline",
    description:
      "A chronological list. Props: title (string, optional), dates (array of date or step strings), events (array of event strings, same length and order as dates). Use ONLY when the data carries a real date or sequence; do not invent dates. Off by default.",
    props: z.object({
      title: z.string().optional(),
      dates: z.array(z.string()),
      events: z.array(z.string()),
    }),
    enabled: false,
    Component: DTTimeline,
  },
  {
    name: "Kanban",
    description:
      "A board of columns holding cards. Props: columnTitles (array of column-name strings), columnCards (array of arrays of card strings; columnCards[i] holds the cards under columnTitles[i]), columnCategories (optional array of numbers 1-6, one per column, to color-code columns by data category from the Theme palette). Use ONLY when the data has a status or stage to group by. Off by default.",
    props: z.object({
      columnTitles: z.array(z.string()),
      columnCards: z.array(z.array(z.string())),
      columnCategories: z.array(z.number().int().min(1).max(6)).optional(),
    }),
    enabled: false,
    Component: DTKanban,
  },
  {
    name: "Matrix",
    description:
      "A two-axis placement chart (e.g. effort vs impact). Props: title (string, optional), xAxis (string label), yAxis (string label), items (array of item strings), x (array of numbers 0-100, same length as items), y (array of numbers 0-100, same length as items), category (optional array of numbers 1-6, same length as items, to color-code points by data category from the Theme palette). Use ONLY when you can justify two rateable axes from the data; do not invent scores. Off by default.",
    props: z.object({
      title: z.string().optional(),
      xAxis: z.string(),
      yAxis: z.string(),
      items: z.array(z.string()),
      x: z.array(z.number()),
      y: z.array(z.number()),
      category: z.array(z.number().int().min(1).max(6)).optional(),
    }),
    enabled: false,
    Component: DTMatrix,
  },
];

/** Representative props for the Catalog tab's live samples. */
export const CATALOG_SAMPLES: Record<
  string,
  { props: Record<string, unknown>; childrenSample?: boolean }
> = {
  Heading: { props: { text: "Section heading", level: 2 } },
  Text: { props: { text: "A short paragraph of supporting body copy.", tone: "default" } },
  Card: { props: { title: "Card title", body: "A short supporting line.", accent: "brand" }, childrenSample: true },
  Badge: { props: { label: "Accepting", tone: "success" } },
  List: { props: { title: "Checklist", items: ["First item", "Second item"], ordered: false } },
  Button: { props: { label: "Action", intent: "primary" } },
  Image: { props: { alt: "A captioned image placeholder" } },
  Icon: { props: { name: "check", label: "Done" } },
  Divider: { props: {} },
  Stack: { props: { direction: "horizontal" }, childrenSample: true },
  CardWithImage: { props: { title: "Onboarding illustrations", caption: "Sketches approved, vectors in progress.", alt: "Illustration preview" } },
  ProductCard: { props: { title: "Focus timer", price: "$12", meta: "Productivity", alt: "Product photo" } },
  StatCard: { props: { label: "Sessions complete", value: "5", unit: "/ 8", trend: "up" } },
  IconCard: { props: { icon: "calendar", label: "Due Friday", value: "Offsite planning doc" } },
  PieChart: { props: { title: "Sources", labels: ["A", "B", "C"], values: [50, 30, 20] } },
  Table: {
    props: {
      columns: ["Task", "Owner", "Status"],
      rows: [
        ["Redesign empty states", "Ari", "In progress"],
        ["Token migration QA", "Dana", "Blocked"],
      ],
    },
  },
  Timeline: {
    props: {
      title: "Launch plan",
      dates: ["Jul 1", "Jul 8", "Jul 15"],
      events: ["Product roundup", "GenUI explainer", "Workshop recap"],
    },
  },
  Kanban: {
    props: {
      columnTitles: ["To do", "In progress", "Done"],
      columnCards: [["Icon cleanup"], ["Empty states"], ["Onboarding copy"]],
    },
  },
  Matrix: {
    props: {
      xAxis: "Effort",
      yAxis: "Impact",
      items: ["Search fix", "Icon cleanup"],
      x: [30, 20],
      y: [85, 25],
    },
  },
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

/** Model-facing one-line-per-component catalog description. A per-component
    description override (the designer's edited text from the Catalog surface)
    replaces the static one when present and non-empty; otherwise the static
    default is used. */
export const catalogPromptText = (
  enabledNames?: Set<string>,
  descriptions?: Record<string, string>
) =>
  enabledCatalog(enabledNames)
    .map((c) => {
      const override = descriptions?.[c.name];
      const text = override && override.trim() ? override : c.description;
      return `- ${c.name}: ${text}`;
    })
    .join("\n");

/**
 * Always-available layout containers. A2UI renders one root node per surface, so
 * composing more than one component requires a container to hold the children;
 * with `includeBasicCatalog` off, CopilotKit supplies none, so the host must
 * guarantee one. `Stack` is therefore FIXED-on (not a designer toggle): it is
 * kept in the agent's catalog regardless of the enable state, shown as an
 * always-on "layout" row, and excluded from the curate-count. Single source for
 * buildCatalog (the agent), the why-panel mirrors, and the Catalog tab UI.
 */
export const ALWAYS_KEEP = new Set(["Stack"]);

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

/**
 * Extract a fenced block AND report whether it was truncated.
 *
 * A well-formed (closed) ```lang ... ``` block wins and reports
 * `truncated: false`. If only an opening fence exists (the closing fence was
 * lost to the token budget mid-block), fall back to capturing from the opening
 * fence to end-of-text and report `truncated: true`. Returns null only when no
 * opening fence of this language is present at all. This is the single source
 * of truth; `parseFencedBlock` delegates to it for callers that only need the
 * body, while callers that must surface truncation (e.g. the open-ended render)
 * read the flag.
 */
export function parseFencedBlockMeta(
  text: string,
  lang: string
): { body: string; truncated: boolean } | null {
  const closed = new RegExp("```" + lang + "\\s*\\n([\\s\\S]*?)```", "i");
  const m = text.match(closed);
  if (m) return { body: m[1].trim(), truncated: false };
  const open = new RegExp("```" + lang + "\\s*\\n([\\s\\S]*)$", "i");
  const partial = text.match(open);
  return partial ? { body: partial[1].trim(), truncated: true } : null;
}

/**
 * Extract the first fenced block of a given language from model text.
 * Truncation-resilient (see {@link parseFencedBlockMeta}); returns just the
 * body, or null when absent. Behavior is unchanged from before the meta split.
 */
export function parseFencedBlock(text: string, lang: string): string | null {
  return parseFencedBlockMeta(text, lang)?.body ?? null;
}

// Note: componentsAllowed is intentionally NOT in this schema. The app owns
// the allowed-components list (see allowedComponentNames); the model only
// reports the pattern, the rules it applied, and decisions it had to make.
// Extra keys a model emits are stripped by safeParse, so this stays tolerant.
export const whySchema = z.object({
  pattern: z.string(),
  rulesApplied: z.array(z.string()),
  /** The data dimension the agent arranged into a structure (columns, axes, a
      timeline), and how it was inferred — or a note that a component was
      avoided because the data lacked its dimension. The structure-honesty
      account; surfaced in the Why panel. */
  structure: z.string().optional(),
  /** What the agent was trying to achieve for the stated audience/goal. */
  intent: z.string().optional(),
  /** Which part(s) of the user's data backed the output (traceability). */
  source: z.string().optional(),
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

/**
 * Model text with the machine blocks (why/json/html) stripped out.
 *
 * First removes well-formed (closed) blocks. Then removes a trailing UNCLOSED
 * block: when output is truncated the final ```html / ```json / ```why fence
 * never closes, so the closed-block pass leaves it behind and raw markup would
 * leak into the chat line. The second pass strips from that dangling fence to
 * the end of the text. On well-formed output no dangling fence remains, so the
 * second pass is a no-op and the normal path is unchanged.
 */
export function commentaryOf(text: string): string {
  return text
    .replace(/```(why|json|html)\s*\n[\s\S]*?```/gi, "")
    .replace(/```(why|json|html)\b[\s\S]*$/i, "")
    .trim();
}
