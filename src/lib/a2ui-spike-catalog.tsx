"use client";

/**
 * A2UI spike — catalog adapter (dev-only, isolated, CLIENT-ONLY).
 *
 * Maps four of daily-tool's existing editorial primitives into a REAL A2UI
 * catalog via @copilotkit/a2ui-renderer's createCatalog, reusing the SAME Zod
 * prop shapes as src/lib/catalog.tsx.
 *
 * Marked "use client" on purpose: @copilotkit/a2ui-renderer calls
 * React.createContext at module load, so it is a client-only package and must
 * NOT be imported into a server route. The spike runtime route therefore carries
 * its own plain-data schema (component names + descriptions); this file owns the
 * React renderers. The component names and prop names must mirror that schema.
 *
 * A2UI references children by ID: a container's renderer receives a
 * `children(id)` resolver and pulls child IDs from its own props (here,
 * Stack.childIds). This differs from daily-tool's nested-object spec on
 * purpose — it is what real A2UI expects.
 */

import { Fragment } from "react";
import { z } from "zod";
import {
  createCatalog,
  type CatalogDefinitions,
  type CatalogRenderers,
} from "@copilotkit/a2ui-renderer";
import {
  DTBadge,
  DTButton,
  DTCard,
  DTDivider,
  DTHeading,
  DTIcon,
  DTImage,
  DTKanban,
  DTList,
  DTMatrix,
  DTPieChart,
  DTStack,
  DTTable,
  DTTimeline,
} from "@/components/catalog-primitives";

const definitions = {
  Heading: {
    description: "A section heading. Props: text (string), level (1, 2 or 3).",
    props: z.object({
      text: z.string(),
      level: z.number().min(1).max(3).optional(),
    }),
  },
  Card: {
    description:
      "A bordered card. Props: title (string, optional), body (string, optional), accent ('none' | 'brand'), children (array of the IDs of child components to place inside, in order). 'childIds' is accepted as an alias.",
    props: z.object({
      title: z.string().optional(),
      body: z.string().optional(),
      accent: z.enum(["none", "brand"]).optional(),
      // Card is a container too: child IDs, same shape as Stack.
      children: z
        .array(z.union([z.string(), z.object({ id: z.string() }).passthrough()]))
        .optional(),
      childIds: z.array(z.string()).optional(),
    }),
  },
  Badge: {
    description:
      "A small status label. Props: label (string), tone ('neutral' | 'success' | 'warning' | 'danger').",
    props: z.object({
      label: z.string(),
      tone: z.enum(["neutral", "success", "warning", "danger"]).optional(),
    }),
  },
  Stack: {
    description:
      "A layout container. Props: direction ('vertical' | 'horizontal'), children (array of the IDs of the child components to place in order). 'childIds' is accepted as an alias.",
    props: z.object({
      direction: z.enum(["vertical", "horizontal"]).optional(),
      // A2UI's native ComponentCommon field. The agent emits child IDs here.
      children: z
        .array(z.union([z.string(), z.object({ id: z.string() }).passthrough()]))
        .optional(),
      // Back-compat alias (some runs emit this key instead).
      childIds: z.array(z.string()).optional(),
    }),
  },
  List: {
    description:
      "A short list of items. Props: title (string, optional), items (array of strings), ordered (boolean).",
    props: z.object({
      title: z.string().optional(),
      items: z.array(z.string()),
      ordered: z.boolean().optional(),
    }),
  },
  Button: {
    description:
      "A display-only action button. Props: label (string), intent ('primary' | 'secondary'). It does not perform actions in this version.",
    props: z.object({
      label: z.string(),
      intent: z.enum(["primary", "secondary"]).optional(),
    }),
  },
  Image: {
    description:
      "An image or photo. Props: alt (string, a short description), src (string, optional URL). Set src ONLY if the user's data contains a real image URL; never invent one. With no real src it shows a captioned placeholder.",
    props: z.object({
      alt: z.string(),
      src: z.string().optional(),
    }),
  },
  Icon: {
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
  },
  Divider: {
    description: "A thin horizontal rule that separates sections. No props.",
    props: z.object({}),
  },
  PieChart: {
    description:
      "A pie chart summarizing parts of a whole. Props: title (string, optional), labels (array of strings), values (array of numbers, same length as labels).",
    props: z.object({
      title: z.string().optional(),
      labels: z.array(z.string()),
      values: z.array(z.number()),
    }),
  },
  Table: {
    description:
      "A data table for items that share the same fields. Props: columns (array of column-header strings), rows (array of rows, each row an array of cell strings in the same order as columns), caption (string, optional). Use when the data has consistent fields across many items.",
    props: z.object({
      columns: z.array(z.string()),
      rows: z.array(z.array(z.string())),
      caption: z.string().optional(),
    }),
  },
  Timeline: {
    description:
      "A chronological list. Props: title (string, optional), dates (array of date or step strings), events (array of event strings, same length and order as dates). Use ONLY when the data carries a real date or sequence; do not invent dates.",
    props: z.object({
      title: z.string().optional(),
      dates: z.array(z.string()),
      events: z.array(z.string()),
    }),
  },
  Kanban: {
    description:
      "A board of columns holding cards. Props: columnTitles (array of column-name strings), columnCards (array of arrays of card strings; columnCards[i] holds the cards under columnTitles[i]). Use ONLY when the data has a status or stage to group by.",
    props: z.object({
      columnTitles: z.array(z.string()),
      columnCards: z.array(z.array(z.string())),
    }),
  },
  Matrix: {
    description:
      "A two-axis placement chart (e.g. effort vs impact). Props: title (string, optional), xAxis (string label), yAxis (string label), items (array of item strings), x (array of numbers 0-100, same length as items), y (array of numbers 0-100, same length as items). Use ONLY when you can justify two rateable axes from the data; do not invent scores.",
    props: z.object({
      title: z.string().optional(),
      xAxis: z.string(),
      yAxis: z.string(),
      items: z.array(z.string()),
      x: z.array(z.number()),
      y: z.array(z.number()),
    }),
  },
} satisfies CatalogDefinitions;

/** The React renderers, kept as a named map so a catalog can be built from a
    subset of component names (catalog-governance enforcement). */
const renderers = {
  Heading: ({ props }) => <DTHeading text={props.text} level={props.level} />,
  Card: ({ props, children }) => {
    // Card is a container too: resolve child IDs the same way Stack does.
    const list = props.children ?? props.childIds ?? [];
    const ids = (Array.isArray(list) ? list : [])
      .map((item) =>
        typeof item === "string"
          ? item
          : item && typeof item === "object" && "id" in item
            ? item.id
            : null
      )
      .filter((id): id is string => Boolean(id));
    return (
      <DTCard title={props.title} body={props.body} accent={props.accent}>
        {ids.map((id, i) => (
          <Fragment key={`${id}-${i}`}>{children(id)}</Fragment>
        ))}
      </DTCard>
    );
  },
  Badge: ({ props }) => <DTBadge label={props.label} tone={props.tone} />,
  Stack: ({ props, children }) => {
    // A2UI references children by ID. The agent emits the ID list under the
    // native `children` field (A2UI ComponentCommon) OR our `childIds` alias,
    // non-deterministically; entries may be plain ID strings or { id } objects.
    // Resolve from whichever is present and normalize to IDs, mirroring
    // CopilotKit's renderChildList (a2ui-renderer ChildList.tsx). `children`
    // (the second arg) is the buildChild resolver, distinct from props.children.
    const list = props.children ?? props.childIds ?? [];
    const ids = (Array.isArray(list) ? list : [])
      .map((item) =>
        typeof item === "string"
          ? item
          : item && typeof item === "object" && "id" in item
            ? item.id
            : null
      )
      .filter((id): id is string => Boolean(id));
    return (
      <DTStack direction={props.direction}>
        {ids.map((id, i) => (
          <Fragment key={`${id}-${i}`}>{children(id)}</Fragment>
        ))}
      </DTStack>
    );
  },
  List: ({ props }) => (
    <DTList title={props.title} items={props.items} ordered={props.ordered} />
  ),
  Button: ({ props }) => <DTButton label={props.label} intent={props.intent} />,
  Image: ({ props }) => <DTImage alt={props.alt} src={props.src} />,
  Icon: ({ props }) => <DTIcon name={props.name} label={props.label} />,
  Divider: () => <DTDivider />,
  PieChart: ({ props }) => (
    <DTPieChart title={props.title} labels={props.labels} values={props.values} />
  ),
  Table: ({ props }) => (
    <DTTable columns={props.columns} rows={props.rows} caption={props.caption} />
  ),
  Timeline: ({ props }) => (
    <DTTimeline title={props.title} dates={props.dates} events={props.events} />
  ),
  Kanban: ({ props }) => (
    <DTKanban columnTitles={props.columnTitles} columnCards={props.columnCards} />
  ),
  Matrix: ({ props }) => (
    <DTMatrix
      title={props.title}
      xAxis={props.xAxis}
      yAxis={props.yAxis}
      items={props.items}
      x={props.x}
      y={props.y}
    />
  ),
} satisfies CatalogRenderers<typeof definitions>;

const CATALOG_OPTIONS = {
  // Pass E (2026-06-22): DROPPED to false. This is a CLIENT-side render option
  // (it merges CopilotKit's 18 generic basic components into the renderable map);
  // it does NOT change what the agent emits. A keyed-prod batch (12/12) showed
  // the agent only ever uses our 11 DT names and emits flat `children` arrays —
  // the basic catalog was an unused safety net, off-brand if it ever fired. With
  // false we register ONLY the 11 DT components: the curated designer vocabulary,
  // which is the teaching thesis. The agent's vocabulary is governed server-side
  // by route.ts A2UI_SCHEMA regardless.
  includeBasicCatalog: false,
  // KEEP this on the basic-catalog URL. The a2ui middleware HARDCODES this id in
  // the surface the agent emits ("the catalog id is set by the host"); there is
  // no runtime option to change it, and every emitted createSurface carries it
  // (verified 12/12). createCatalog registers OUR catalog under whatever id we
  // pass here, so this MUST match the emitted id or the renderer throws
  // "Catalog not found". Do NOT re-point this to a custom id — that breaks
  // rendering even though it reads as "more correct". (Pass E corrected the
  // earlier note that said to re-point it.)
  catalogId: "https://a2ui.org/specification/v0_9/basic_catalog.json",
} as const;

// Container components must always be available or layout can't be assembled,
// even if a designer disables them in the Catalog tab.
const ALWAYS_KEEP = new Set(["Stack"]);

/**
 * Build the A2UI render catalog from a subset of enabled component names. This
 * is the CLIENT-side half of catalog governance (Pass B, Approach B): disabling
 * a component in the Catalog tab means its renderer is absent here, so a real
 * A2UI surface that references it simply does not paint that node. Pass no arg
 * for the full catalog (the spike's behavior, preserved).
 */
export function buildCatalog(enabledNames?: ReadonlySet<string>) {
  if (!enabledNames) return createCatalog(definitions, renderers, CATALOG_OPTIONS);
  const keep = (name: string) => enabledNames.has(name) || ALWAYS_KEEP.has(name);
  const defs = Object.fromEntries(
    Object.entries(definitions).filter(([name]) => keep(name))
  ) as typeof definitions;
  const rends = Object.fromEntries(
    Object.entries(renderers).filter(([name]) => keep(name))
  ) as typeof renderers;
  const built = createCatalog(defs, rends, CATALOG_OPTIONS);
  // Close the basic-catalog governance hole: createCatalog merges CopilotKit's
  // basic catalog, which ALSO defines Card / List / Button. Filtering our
  // definitions drops the DT renderer but leaves the GENERIC basic version in
  // the merged map, so a disabled Card/List/Button would still paint. Remove
  // every disabled DT-vocabulary name from the map so the catalog truly governs
  // (the 8 non-colliding names are already absent, so this only bites the 3).
  // components is typed ReadonlyMap but is a real mutable Map at runtime
  // (web_core registers via compMap.set); we mutate the freshly-built, not-yet-
  // mounted catalog, so there is no shared state to corrupt.
  const map = (built as unknown as { components?: Map<string, unknown> })
    ?.components;
  if (map && typeof map.delete === "function") {
    for (const name of Object.keys(definitions)) {
      if (!keep(name)) map.delete(name);
    }
  }
  return built;
}

/** Full React catalog (all components). Used by the dev spike page verbatim. */
export const catalog = buildCatalog();
