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
import { createCatalog, type CatalogDefinitions } from "@copilotkit/a2ui-renderer";
import {
  DTBadge,
  DTCard,
  DTHeading,
  DTStack,
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
      "A bordered card for one idea. Props: title (string), body (string), accent ('none' | 'brand').",
    props: z.object({
      title: z.string(),
      body: z.string(),
      accent: z.enum(["none", "brand"]).optional(),
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
      "A layout container. Props: direction ('vertical' | 'horizontal'), childIds (array of child component IDs to place in order).",
    props: z.object({
      direction: z.enum(["vertical", "horizontal"]).optional(),
      childIds: z.array(z.string()).optional(),
    }),
  },
} satisfies CatalogDefinitions;

/** React catalog the A2UI renderer uses to paint the agent's emitted operations. */
export const catalog = createCatalog(
  definitions,
  {
    Heading: ({ props }) => <DTHeading text={props.text} level={props.level} />,
    Card: ({ props }) => (
      <DTCard title={props.title} body={props.body} accent={props.accent} />
    ),
    Badge: ({ props }) => <DTBadge label={props.label} tone={props.tone} />,
    Stack: ({ props, children }) => (
      <DTStack direction={props.direction}>
        {(props.childIds ?? []).map((id) => (
          <Fragment key={id}>{children(id)}</Fragment>
        ))}
      </DTStack>
    ),
  },
  {
    includeBasicCatalog: true,
    // FIX (2026-06-18, verified on a prod run): the agent's emitted surface
    // references the A2UI basic catalog by its URL, but createCatalog defaults this
    // catalog's id to "copilotkit://custom-catalog", so the renderer threw
    // "Catalog not found: .../basic_catalog.json". Registering under the basic URL
    // aligns the id the agent references with the one we register, and the surface
    // paints (Heading + 3 Cards + severity Badges, DT primitives, zero console
    // errors). Pragmatic id-alignment; a dedicated custom-catalog id advertised via
    // an extractSchema-equivalent is the cleaner long-term form. The root cause: the
    // runtime schema is hand-written plain data (a2ui-renderer is client-only, can't
    // run extractSchema server-side), so the agent falls back to the basic catalog.
    catalogId: "https://a2ui.org/specification/v0_9/basic_catalog.json",
  },
);
