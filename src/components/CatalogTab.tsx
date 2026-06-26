"use client";

import { useState } from "react";
import { ALWAYS_KEEP, CATALOG } from "@/lib/catalog";
import { TeachingCard, HonestyChip } from "@/components/TeachingCard";
import {
  IconHeading,
  IconSquareRounded,
  IconTag,
  IconList,
  IconClick,
  IconPhoto,
  IconStar,
  IconMinus,
  IconStack2,
  IconChartPie,
  IconTable,
  IconTimeline,
  IconLayoutKanban,
  IconGridDots,
  IconSearch,
  IconEye,
  IconPencil,
  IconPlus,
  IconAlignLeft,
  IconArticle,
  IconShoppingBag,
  IconChartBar,
  IconId,
} from "@tabler/icons-react";

/**
 * Catalog tab: one of the levers. The component allow-list as compact rows
 * (matching mockups/prompt-page-v2.html): icon + name + a one-line role + a
 * "what the agent sees" disclosure (the agent-read description, editable) + an
 * enable toggle. A search field and an All/On/Off filter sit at the top. Every
 * component is OFF by default (the designer curates the allow-list): Basic =
 * presentational primitives, Composed = whole multi-part components, Structured
 * = data-shape components.
 *
 * In a popup the `bare` prop drops this component's own chip / intro / teaching
 * card (the popup chrome already states them); the search + rows stay.
 */
const BASIC = ["Heading", "Highlight", "Footnote", "Text", "Card", "Badge", "List", "Button", "Image", "Icon", "Divider", "Stack"];
const COMPOSED = ["CardWithImage", "ProductCard", "StatCard", "IconCard"];
const STRUCTURED = ["PieChart", "Table", "Timeline", "Kanban", "Matrix"];

// Per-component icon + short role (the mockup's row metadata).
const META: Record<string, { icon: typeof IconHeading; role: string }> = {
  Heading: { icon: IconHeading, role: "Section heading" },
  Text: { icon: IconAlignLeft, role: "Paragraph of body text" },
  Card: { icon: IconSquareRounded, role: "Bordered card, composes children" },
  Badge: { icon: IconTag, role: "Small status label" },
  List: { icon: IconList, role: "Short list of items" },
  Button: { icon: IconClick, role: "Display-only button" },
  Image: { icon: IconPhoto, role: "Image or placeholder" },
  Icon: { icon: IconStar, role: "Small glyph" },
  Divider: { icon: IconMinus, role: "Horizontal rule" },
  Stack: { icon: IconStack2, role: "Layout container" },
  PieChart: { icon: IconChartPie, role: "Parts of a whole" },
  Table: { icon: IconTable, role: "Rows that share fields" },
  Timeline: { icon: IconTimeline, role: "Dated sequence" },
  Kanban: { icon: IconLayoutKanban, role: "Columns of cards" },
  Matrix: { icon: IconGridDots, role: "Two-axis placement" },
  CardWithImage: { icon: IconArticle, role: "Image card with title + caption" },
  ProductCard: { icon: IconShoppingBag, role: "Image, title, price" },
  StatCard: { icon: IconChartBar, role: "A single statistic" },
  IconCard: { icon: IconId, role: "Icon, label, value" },
};

export function CatalogTab({
  enabled,
  onToggle,
  descriptions,
  onDescriptionChange,
  onDescriptionReset,
  bare,
}: {
  enabled: Record<string, boolean>;
  onToggle: (name: string, next: boolean) => void;
  descriptions: Record<string, string>;
  onDescriptionChange: (name: string, value: string) => void;
  onDescriptionReset: (name: string) => void;
  /** In-popup mode: drop the chip + intro + teaching card (the popup says them);
      keep the search + rows. */
  bare?: boolean;
}) {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "on" | "off">("all");

  const visible = (name: string) => {
    const on = ALWAYS_KEEP.has(name) || (enabled[name] ?? false);
    if (filter === "on" && !on) return false;
    if (filter === "off" && on) return false;
    if (query && !name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  };

  const renderRow = (name: string) => {
    const entry = CATALOG.find((e) => e.name === name);
    if (!entry || !visible(name)) return null;
    const meta = META[name];
    const Ic = meta?.icon ?? IconSquareRounded;
    // Fixed-on layout containers (Stack) are not toggles: they are always supplied
    // to the agent so a multi-component layout can be assembled, so disabling them
    // would be a false affordance. Shown as an "always on" row instead.
    const fixed = ALWAYS_KEEP.has(name);
    const on = fixed || (enabled[name] ?? false);
    const edited = descriptions[name] !== undefined;
    const descValue = edited ? descriptions[name] : entry.description;
    const isRevealed = revealed[name] ?? false;
    const isEditing = editing[name] ?? false;
    return (
      <div className="row" key={name}>
        <div className="rhead">
          <div className="ricon">
            <Ic size={17} stroke={1.5} />
          </div>
          <div className="rmain">
            <div className="rname">
              {name}
              {entry.container ? <span className="tag tag-c">container</span> : null}
              {edited ? <span className="tag tag-c">edited</span> : null}
            </div>
            <div className="rrole">{meta?.role ?? ""}</div>
          </div>
          <button
            type="button"
            className="disc"
            aria-expanded={isRevealed}
            onClick={() => setRevealed((p) => ({ ...p, [name]: !isRevealed }))}
          >
            <IconEye size={13} stroke={1.5} />
            what the agent sees
          </button>
          {fixed ? (
            <span
              className="text-[10px] font-medium uppercase tracking-wide text-[var(--faint)]"
              title="Layout container — always available so the agent can compose a multi-component layout. Not part of the curated allow-list."
              style={{ whiteSpace: "nowrap" }}
            >
              always on
            </span>
          ) : (
            <button
              type="button"
              className="tog"
              role="switch"
              aria-checked={on}
              aria-label={`${name} ${on ? "enabled" : "disabled"}`}
              onClick={() => onToggle(name, !on)}
            >
              <span className="knob" />
            </button>
          )}
        </div>
        {isRevealed ? (
          <div className="sees">
            <div className="cap">
              <IconEye size={13} stroke={1.5} />
              The description the agent reads
            </div>
            <p style={{ fontSize: 11, lineHeight: 1.4, color: "var(--faint)", marginBottom: 6 }}>
              Write what this component is <em>for</em> (a role), e.g.
              &ldquo;Use for the page title.&rdquo; Steers <em>which</em> component
              the agent picks, not how it renders.
            </p>
            {isEditing ? (
              <textarea
                className="desc"
                value={descValue}
                onChange={(e) => onDescriptionChange(name, e.target.value)}
                rows={3}
                aria-label={`${name} description (the agent reads this)`}
                style={{ width: "100%", resize: "vertical", outline: "none", fontFamily: "var(--font-sans)" }}
              />
            ) : (
              <div className="desc">{descValue}</div>
            )}
            <div className="acts">
              <button type="button" onClick={() => setEditing((p) => ({ ...p, [name]: !isEditing }))}>
                <IconPencil size={12} stroke={1.5} style={{ verticalAlign: "-1px" }} />{" "}
                {isEditing ? "Done" : "Edit"}
              </button>
              {edited ? (
                <button type="button" onClick={() => onDescriptionReset(name)}>
                  Reset
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <>
      {!bare && (
        <div className="px-1 pb-2">
          <div className="mb-2 flex justify-end">
            <HonestyChip variant="hard">Hard · enforced</HonestyChip>
          </div>
          <p className="text-sm text-[var(--muted)]">
            Your design system as an allow-list. On Controlled and Declarative,
            turn a component off and the agent can no longer reach for it on the
            next run. Open-ended has no catalog, by design.
          </p>
        </div>
      )}

      <div className="ptools">
        <div className="srch">
          <IconSearch size={16} stroke={1.5} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search components…"
            aria-label="Search components"
          />
        </div>
        <div className="filt">
          {(["all", "on", "off"] as const).map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : f === "on" ? "On" : "Off"}
            </button>
          ))}
        </div>
      </div>

      <div className="catbody">
        <div className="grp">Basic</div>
        {BASIC.map(renderRow)}
        <div className="grp">Composed</div>
        <p
          className="text-xs text-[var(--muted)]"
          style={{ margin: "0 0 6px", padding: "0 2px" }}
        >
          Whole, multi-part components. Most useful in Controlled, where the agent
          picks one block and fills it (it can&rsquo;t assemble parts itself).
          CopilotKit calls this &ldquo;components as tools.&rdquo;
        </p>
        {COMPOSED.map(renderRow)}
        <div className="grp">Structured</div>
        {STRUCTURED.map(renderRow)}
        <button className="add" type="button" disabled aria-disabled="true" title="Coming soon">
          <IconPlus size={16} stroke={1.5} />
          Add component
          <span className="cs">Coming soon</span>
        </button>
      </div>

      {!bare && (
        <div className="px-1 pt-2">
          <TeachingCard
            name="the Catalog"
            mechanism="A typed component registry. Toggle one off and it leaves the agent's vocabulary, and the renderer hard-rejects anything not on the list. The description is the prose the agent reads, so editing it steers what gets built."
            purpose="The catalog is your design space: on Controlled and Declarative it decides which components can appear, enforced in code, not merely requested. Open-ended lifts the catalog on purpose, the freedom-dial trade-off made real."
          />
        </div>
      )}
    </>
  );
}
