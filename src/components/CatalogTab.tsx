"use client";

import { useState } from "react";
import { ALWAYS_KEEP, CATALOG, propFieldNames } from "@/lib/catalog";
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
  IconInfoCircle,
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

/** A small hover tooltip that actually pops — Tailwind group-hover, no native
    `title` delay. Used for the section-kind explanations and the field hints. */
function InfoTip({ text }: { text: string }) {
  return (
    <span
      className="group relative inline-flex cursor-help align-middle"
      style={{ color: "var(--faint)" }}
    >
      <IconInfoCircle size={12} stroke={1.5} />
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute left-0 top-full z-50 mt-1 w-56 rounded-md px-2.5 py-1.5 text-[11px] font-normal normal-case leading-snug tracking-normal opacity-0 shadow-lg transition-opacity duration-100 group-hover:visible group-hover:opacity-100"
        style={{ background: "#1f2a27", color: "#f2f5f1" }}
      >
        {text}
      </span>
    </span>
  );
}

export function CatalogTab({
  enabled,
  onToggle,
  descriptions,
  onDescriptionChange,
  onDescriptionReset,
  labels,
  onLabelChange,
  onLabelReset,
  bare,
}: {
  enabled: Record<string, boolean>;
  onToggle: (name: string, next: boolean) => void;
  descriptions: Record<string, string>;
  onDescriptionChange: (name: string, value: string) => void;
  onDescriptionReset: (name: string) => void;
  /** The rename lever (Controlled only): the designer's edited agent-facing
      name per component. Keyed by the built-in name; the renderer still
      resolves by the built-in name, so renaming only steers selection. */
  labels: Record<string, string>;
  onLabelChange: (name: string, value: string) => void;
  onLabelReset: (name: string) => void;
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
    const nameEdited = labels[name] !== undefined;
    const nameValue = nameEdited ? labels[name] : name;
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
              {edited || nameEdited ? <span className="tag tag-c">edited</span> : null}
            </div>
            <div className="rrole">{meta?.role ?? ""}</div>
          </div>
          <button
            type="button"
            className="disc"
            aria-expanded={isRevealed}
            aria-label={
              isRevealed
                ? "Hide the agent-facing name and description"
                : "Show the agent-facing name and description"
            }
            title={
              isRevealed
                ? "Hide the agent-facing name and description"
                : "Show the agent-facing name and description"
            }
            onClick={() => setRevealed((p) => ({ ...p, [name]: !isRevealed }))}
          >
            <IconEye size={14} stroke={1.5} />
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
            {isEditing ? (
              <>
                <div style={{ marginBottom: 8 }}>
                  <label
                    htmlFor={`name-${name}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--muted)",
                      marginBottom: 3,
                    }}
                  >
                    <span>Name the agent uses</span>
                    <span style={{ fontWeight: 500, color: "var(--faint)" }}>
                      · Controlled only
                    </span>
                    <InfoTip text="Renames what the agent calls this on Controlled. Steers which component it picks, not how it renders. No effect on Declarative or Open-ended." />
                  </label>
                  <input
                    id={`name-${name}`}
                    className="desc"
                    value={nameValue}
                    onChange={(e) => onLabelChange(name, e.target.value)}
                    aria-label={`${name} agent-facing name (Controlled only)`}
                    style={{ width: "100%", outline: "none", fontFamily: "var(--font-sans)" }}
                  />
                </div>
                <label
                  htmlFor={`desc-${name}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--muted)",
                    marginBottom: 3,
                  }}
                >
                  <span>Description the agent reads</span>
                  <InfoTip text="Write what this component is for, e.g. “Use for the page title.” Steers which component the agent picks, not how it renders." />
                </label>
                <textarea
                  id={`desc-${name}`}
                  className="desc"
                  value={descValue}
                  onChange={(e) => onDescriptionChange(name, e.target.value)}
                  rows={3}
                  aria-label={`${name} description (the agent reads this)`}
                  style={{ width: "100%", resize: "vertical", outline: "none", fontFamily: "var(--font-sans)" }}
                />
              </>
            ) : (
              <div className="desc">{descValue}</div>
            )}
            {(() => {
              const fields = propFieldNames(entry);
              return (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 11,
                    lineHeight: 1.4,
                    color: "var(--faint)",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>
                    Fields the agent fills:
                  </span>{" "}
                  {fields.length ? (
                    fields.map((f, i) => (
                      <span key={f}>
                        {i > 0 ? ", " : ""}
                        <code style={{ fontFamily: "var(--font-mono)" }}>{f}</code>
                      </span>
                    ))
                  ) : (
                    <em>none</em>
                  )}
                  <span style={{ marginLeft: 6, fontStyle: "italic" }}>
                    · from the component&rsquo;s schema (read-only)
                  </span>
                </div>
              );
            })()}
            <div className="acts">
              <button type="button" onClick={() => setEditing((p) => ({ ...p, [name]: !isEditing }))}>
                <IconPencil size={12} stroke={1.5} style={{ verticalAlign: "-1px" }} />{" "}
                {isEditing ? "Done" : "Edit"}
              </button>
              {edited ? (
                <button type="button" onClick={() => onDescriptionReset(name)}>
                  Reset description
                </button>
              ) : null}
              {nameEdited ? (
                <button type="button" onClick={() => onLabelReset(name)}>
                  Reset name
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
        <div className="grp">
          Basic{" "}
          <InfoTip text="Presentational primitives. One job each, like a heading, list, or badge." />
        </div>
        {BASIC.map(renderRow)}
        <div className="grp">
          Composed{" "}
          <InfoTip text="Whole, multi-part components built from several pieces, like an image card or stat card." />
        </div>
        {COMPOSED.map(renderRow)}
        <div className="grp">
          Structured{" "}
          <InfoTip text="Data-shape components that render a structure, like tables, charts, and boards." />
        </div>
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
