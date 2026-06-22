"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import {
  CopilotKitProvider,
  useAgent,
  useAgentContext,
  useCopilotKit,
} from "@copilotkit/react-core/v2";

import { DataTab, type DataContext } from "@/components/DataTab";
import { RulesTab } from "@/components/RulesTab";
import { CatalogTab } from "@/components/CatalogTab";
import {
  StyleTab,
  STYLE_SETS,
  activeStyleSetName,
  DEFAULT_TOKENS,
  type StyleTokens,
} from "@/components/StyleTab";
import { WhyPanel } from "@/components/WhyPanel";
import { TeachingCard } from "@/components/TeachingCard";
import { ChatPanel, type ChatTurn } from "@/components/ChatPanel";
import { StaticPattern, type StaticBlock } from "@/components/StaticPattern";
import { DeclarativePattern } from "@/components/DeclarativePattern";
import { DeclarativeA2UILive } from "@/components/DeclarativeA2UILive";
import { LegibilityView } from "@/components/LegibilityView";
import { CatalogView } from "@/components/CatalogView";
import { OpenEndedPattern } from "@/components/OpenEndedPattern";
import {
  CATALOG,
  allowedComponentNames,
  catalogPromptText,
  commentaryOf,
  declarativeSpecSchema,
  parseFencedBlock,
  parseWhy,
  type SpecNode,
  type WhyAccount,
} from "@/lib/catalog";
import { DEFAULT_DATA, DEFAULT_REQUEST, DEFAULT_RULES } from "@/lib/default-rules";
import { buildCatalog } from "@/lib/a2ui-spike-catalog";

// Workaround for an upstream bug: @ag-ui/client stores the global `fetch`
// on its agent instance and calls it as a method (`this.fetch(...)`), which
// browsers reject with "Illegal invocation". Binding fetch to window before
// the agent is constructed makes the stored reference safe to call.
// Remove once fixed upstream in @ag-ui/client.
if (typeof window !== "undefined") {
  window.fetch = window.fetch.bind(window);
}

const A2UI_THEME = { colors: { primary: "#0f6b75" } };

const PATTERNS = ["static", "declarative", "open-ended"] as const;
type Pattern = (typeof PATTERNS)[number];
type AuthoringTab = "data" | "rules" | "catalog" | "style";
type Tab = AuthoringTab | "preview" | "notes";

const AUTHORING_TABS: AuthoringTab[] = ["data", "rules", "catalog", "style"];

// Flat, dual-labeled nav: a designer-facing name plus a technical mono
// sub-label, per surface. Authoring surfaces lead (the brief before the build),
// then a divider, then Preview and the Design Notes placeholder.
type NavItem = {
  key: Tab;
  name: string;
  tech: string;
  glyph: string;
  soon?: boolean;
};

const PRIMARY_NAV: NavItem[] = [
  { key: "data", name: "Data", tech: "source text", glyph: "▦" },
  { key: "rules", name: "Rules", tech: "constraints", glyph: "☰" },
  { key: "catalog", name: "Catalog", tech: "component registry", glyph: "▤" },
  { key: "style", name: "Style", tech: "design tokens", glyph: "◑" },
];
const SECONDARY_NAV: NavItem[] = [
  { key: "preview", name: "Preview", tech: "run + reveal", glyph: "▷" },
  {
    key: "notes",
    name: "Design Notes",
    tech: "decision log",
    glyph: "✎",
    soon: true,
  },
];

const LS = {
  data: "daily-tool:v1:data",
  rules: "daily-tool:v1:rules",
  request: "daily-tool:v1:request",
  catalog: "daily-tool:v1:catalog",
  catalogDescriptions: "daily-tool:v1:catalog-descriptions",
  style: "daily-tool:v1:style",
  context: "daily-tool:v1:context",
};

/** One short line per pattern for the rail's selectable cards: who designs,
    what constrains the agent. */
const PATTERN_CARDS: Record<
  Pattern,
  { name: string; line: string; freedom: string }
> = {
  static: {
    name: "Controlled",
    line: "You built the components. The agent fills them.",
    freedom: "Low",
  },
  declarative: {
    name: "Declarative",
    line: "The agent proposes a spec. Your catalog approves.",
    freedom: "Medium",
  },
  "open-ended": {
    name: "Open-ended",
    line: "No catalog. The agent invents the surface.",
    freedom: "High",
  },
};

type RunState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "rate-limited" }
  | { kind: "error"; message: string };

type DailyToolInnerProps = {
  enabled: Record<string, boolean>;
  setEnabled: (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
  enabledNames: Set<string>;
  descriptions: Record<string, string>;
  setDescriptions: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
};

function DailyToolInner({ enabled, setEnabled, enabledNames, descriptions, setDescriptions }: DailyToolInnerProps) {
  const { copilotkit } = useCopilotKit();
  const { agent } = useAgent();

  const [tab, setTab] = useState<Tab>("preview");
  const [pattern, setPattern] = useState<Pattern>("static");
  const [data, setData] = useState(DEFAULT_DATA);
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [request, setRequest] = useState(DEFAULT_REQUEST);
  const [context, setContext] = useState<DataContext>({
    audience: "",
    role: "",
    goal: "",
  });
  const [runState, setRunState] = useState<RunState>({ kind: "idle" });
  const [staticBlocks, setStaticBlocks] = useState<StaticBlock[]>([]);
  const [agentText, setAgentText] = useState<Partial<Record<Pattern, string>>>({});
  const [chatTurns, setChatTurns] = useState<ChatTurn[]>([]);
  // Setup collapses to a compact bar after a Run (freedom-first run flow);
  // editing re-expands it. Presentation-only; does not touch run logic.
  const [setupExpanded, setSetupExpanded] = useState(true);

  // --- real-A2UI Declarative sub-mode (Pass B) ----------------------------
  // Default OFF, never persisted: every load starts on the shipped simplified
  // path, so the floor is always the default. When ON, the Declarative canvas
  // is driven by the dedicated declarativeA2UI agent + the low-level renderer.
  const [realA2UI, setRealA2UI] = useState(false);
  const [a2uiRunNonce, setA2uiRunNonce] = useState(0);
  const [a2uiRequest, setA2uiRequest] = useState("");
  const [a2uiSurfacePresent, setA2uiSurfacePresent] = useState(false);
  // The emitted A2UI operations, lifted up from the island so the reveal panels
  // (Operations / Catalog "used" / Why) read the real run, not the json/why text
  // path. Null until a real run produces ops; cleared at the start of each run.
  const [a2uiOps, setA2uiOps] = useState<ReadonlyArray<
    Record<string, unknown>
  > | null>(null);

  // --- the three levers (Pass 3a) -----------------------------------------
  // `enabled` / `setEnabled` / `enabledNames` are lifted to <Home> (above the
  // provider) so the A2UI catalog can be built from them; they arrive as props.
  const [tokens, setTokens] = useState<StyleTokens>(DEFAULT_TOKENS);

  // --- persistence (survives reload) --------------------------------------
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    try {
      const d = localStorage.getItem(LS.data);
      const r = localStorage.getItem(LS.rules);
      const q = localStorage.getItem(LS.request);
      if (d !== null) setData(d);
      if (r !== null) setRules(r);
      if (q !== null) setRequest(q);

      const st = localStorage.getItem(LS.style);
      if (st) {
        try {
          const parsed = JSON.parse(st);
          if (parsed && typeof parsed === "object") {
            setTokens((prev) => ({ ...prev, ...parsed }));
          }
        } catch {
          /* ignore malformed */
        }
      }
      const ctx = localStorage.getItem(LS.context);
      if (ctx) {
        try {
          const parsed = JSON.parse(ctx);
          if (parsed && typeof parsed === "object") {
            setContext((prev) => ({ ...prev, ...parsed }));
          }
        } catch {
          /* ignore malformed */
        }
      }
    } catch {
      // private mode etc. — run without persistence
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(LS.data, data);
      localStorage.setItem(LS.rules, rules);
      localStorage.setItem(LS.request, request);
      localStorage.setItem(LS.style, JSON.stringify(tokens));
      localStorage.setItem(LS.context, JSON.stringify(context));
    } catch {
      /* non-fatal */
    }
  }, [hydrated, data, rules, request, tokens, context]);

  // --- application context: what the agent knows on every run -------------
  const catalogText = useMemo(
    () => catalogPromptText(enabledNames, descriptions),
    [enabledNames, descriptions]
  );
  useAgentContext({ description: "Active pattern", value: pattern });
  useAgentContext({
    description: "The user's data (the only source of facts)",
    value: data,
  });
  useAgentContext({
    description: "The user's design rules (binding policy)",
    value: rules,
  });
  useAgentContext({
    description: "Component catalog (the allowed vocabulary)",
    value: catalogText,
  });
  const contextText = useMemo(() => {
    const parts: string[] = [];
    if (context.audience.trim()) parts.push(`Audience: ${context.audience.trim()}`);
    if (context.role.trim()) parts.push(`Designer role/voice: ${context.role.trim()}`);
    if (context.goal.trim()) parts.push(`Goal: ${context.goal.trim()}`);
    return parts.join("\n");
  }, [context]);
  useAgentContext({
    description:
      "Audience and goal (optional; shape tone and emphasis, never a source of facts)",
    value: contextText,
  });

  // --- the run -------------------------------------------------------------
  // Shared send path for both drivers (the Run button and the chat). Each send
  // starts from a clean agent thread: carrying prior turns forward made the
  // runtime replay stale tool-call history and fire several model calls for one
  // message, so every render runs from a known, minimal prompt. The visible
  // chat transcript still accumulates; only the agent thread resets. Per-pattern
  // toolChoice is applied; sampling is left to the agent's own default (the
  // creativity lever was dropped). Returns the assistant's raw reply, or null
  // if the run did not complete.
  const runMessage = useCallback(
    async (text: string): Promise<string | null> => {
      if (runState.kind === "running" || !text.trim()) return null;
      setRunState({ kind: "running" });
      if (pattern === "static") setStaticBlocks([]);
      setAgentText((prev) => ({ ...prev, [pattern]: undefined }));
      try {
        agent.setMessages([]);
        agent.addMessage({
          id: crypto.randomUUID(),
          role: "user",
          content: text,
        });
        await copilotkit.runAgent({
          agent,
          // Static: tool calls ARE the pattern. Declarative / Open-Ended:
          // text-only; blocking tools keeps smaller models from drifting
          // into the built-in state tools instead of emitting the spec.
          forwardedProps: {
            toolChoice: pattern === "static" ? "auto" : "none",
          },
        });
        const lastAssistant = [...agent.messages]
          .reverse()
          .find(
            (m) =>
              m.role === "assistant" &&
              typeof m.content === "string" &&
              m.content.trim()
          );
        const reply = (lastAssistant?.content as string) ?? "";
        setAgentText((prev) => ({ ...prev, [pattern]: reply }));
        setRunState({ kind: "idle" });
        return reply;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (/429|rate.?limit|quota|RESOURCE_EXHAUSTED/i.test(message)) {
          setRunState({ kind: "rate-limited" });
        } else {
          setRunState({ kind: "error", message });
        }
        return null;
      }
    },
    [agent, copilotkit, pattern, runState.kind]
  );

  // Real-A2UI run trigger: clear the prior captured text + surface flag, set
  // the request, and bump the nonce so the island fires a run against the
  // declarativeA2UI agent. The island reports back via the handlers below.
  const runRealA2UI = useCallback((text: string) => {
    if (!text.trim()) return;
    setAgentText((prev) => ({ ...prev, declarative: undefined }));
    setA2uiSurfacePresent(false);
    setA2uiOps(null);
    setA2uiRequest(text);
    setA2uiRunNonce((n) => n + 1);
  }, []);

  // The island's run lifecycle maps onto the same run banner as the default path.
  const handleA2UIStatus = useCallback(
    (status: "running" | "complete" | "error", message?: string) => {
      if (status === "running") setRunState({ kind: "running" });
      else if (status === "complete") setRunState({ kind: "idle" });
      else {
        const msg = message ?? "The run failed.";
        if (/429|rate.?limit|quota|RESOURCE_EXHAUSTED/i.test(msg)) {
          setRunState({ kind: "rate-limited" });
        } else {
          setRunState({ kind: "error", message: msg });
        }
      }
    },
    []
  );

  // The last assistant string, kept for the run's commentary line and as a
  // fallback (real A2UI emits no trailing ```why block).
  const handleA2UIReply = useCallback((reply: string) => {
    setAgentText((prev) => ({ ...prev, declarative: reply }));
  }, []);

  // The emitted operations, lifted up to drive the reveal on the real path.
  const handleA2UIOps = useCallback(
    (ops: ReadonlyArray<Record<string, unknown>>) => setA2uiOps(ops),
    []
  );

  const a2uiActive = realA2UI && pattern === "declarative";

  // Run button: clears the chat transcript so the canvas reflects exactly this
  // request, then runs it through the shared path (or the A2UI island).
  const run = useCallback(() => {
    if (!request.trim()) return;
    setChatTurns([]);
    if (a2uiActive) {
      runRealA2UI(request);
      return;
    }
    void runMessage(request);
  }, [request, runMessage, a2uiActive, runRealA2UI]);

  // Chat: appends each exchange to the transcript and renders into the same
  // canvas through the shared path (or the A2UI island).
  const chatSend = useCallback(
    (text: string) => {
      setChatTurns((prev) => [...prev, { role: "user", text }]);
      if (a2uiActive) {
        runRealA2UI(text);
        setChatTurns((prev) => [
          ...prev,
          { role: "assistant", text: "Rendering a live A2UI surface into the canvas." },
        ]);
        return;
      }
      void runMessage(text).then((reply) => {
        const line =
          reply === null
            ? "That run did not complete. Check the canvas note and try again."
            : commentaryOf(reply) || "Rendered into the canvas.";
        setChatTurns((prev) => [...prev, { role: "assistant", text: line }]);
      });
    },
    [runMessage, a2uiActive, runRealA2UI]
  );

  const activeText = agentText[pattern] ?? null;
  // Real-A2UI path: the reveal reads the emitted ops, and real A2UI emits no
  // ```why block, so the Why account is app-truth only (pattern + freedom; no
  // fabricated model narrative). The simplified path keeps parsing the ```why
  // block exactly as before.
  const why: WhyAccount | null = a2uiActive
    ? a2uiOps && a2uiOps.length > 0
      ? { pattern: "declarative", rulesApplied: [] }
      : null
    : activeText
    ? parseWhy(activeText)
    : null;
  const commentary = activeText ? commentaryOf(activeText) : "";
  // App truth, not the model's claim: what this pattern actually allows.
  const allowed = allowedComponentNames(pattern, enabledNames);
  // App truth: which catalog entries the CURRENT render used. Controlled reads
  // the rendered blocks; Declarative walks the emitted spec. Drives the Catalog
  // facet's "used" marks. Open-Ended has no catalog, so the set stays empty.
  const usedNames = useMemo<Set<string>>(() => {
    // Real-A2UI path: the components the emitted ops actually referenced.
    if (a2uiActive) {
      const names = new Set<string>();
      for (const op of a2uiOps ?? []) {
        const uc = (op as Record<string, unknown>).updateComponents as
          | { components?: unknown }
          | undefined;
        if (uc && Array.isArray(uc.components)) {
          for (const c of uc.components) {
            const comp = (c as Record<string, unknown>)?.component;
            if (typeof comp === "string") names.add(comp);
          }
        }
      }
      return names;
    }
    if (pattern === "static") {
      return new Set(staticBlocks.map((b) => b.component));
    }
    if (pattern === "declarative" && activeText) {
      const raw = parseFencedBlock(activeText, "json");
      if (!raw) return new Set();
      try {
        const parsed = declarativeSpecSchema.safeParse(JSON.parse(raw));
        if (!parsed.success) return new Set();
        const names = new Set<string>();
        const walk = (n: SpecNode) => {
          names.add(n.component);
          (n.children ?? []).forEach(walk);
        };
        walk(parsed.data.root);
        return names;
      } catch {
        return new Set();
      }
    }
    return new Set();
  }, [a2uiActive, a2uiOps, pattern, staticBlocks, activeText]);
  // Which named style set is active, or null ("custom") once tokens diverge.
  const activeSet = activeStyleSetName(tokens);

  // Style tokens applied as CSS custom properties on the app root. They drive
  // the rendered OUTPUT (catalog primitives); attendee edits override the
  // editorial defaults live, so their choices lead. globals.css :root holds
  // the chrome palette and the token fallbacks.
  const tokenStyle = {
    "--dt-brand": tokens.brand,
    "--dt-brand-contrast": tokens.brandContrast,
    "--dt-border": tokens.border,
    "--dt-radius": tokens.radius,
    "--dt-gap": tokens.gap,
  } as CSSProperties;

  const railLabel = "mb-2 text-[11px] font-medium uppercase tracking-wider text-[var(--faint)]";

  // One flat nav row: glyph + dual labels + an optional status badge. Active
  // row gets the fixed petrol accent (chrome, never the swappable --dt-brand).
  const renderNavItem = (item: NavItem) => {
    const on = tab === item.key;
    const badge =
      item.key === "catalog"
        ? `${enabledNames.size}/${CATALOG.length}`
        : item.key === "style"
        ? activeSet ?? "Custom"
        : item.key === "notes"
        ? "soon"
        : null;
    return (
      <button
        key={item.key}
        type="button"
        onClick={() => setTab(item.key)}
        className={`relative mb-0.5 flex w-full items-center gap-3 rounded-[9px] px-3 py-2 text-left transition-colors ${
          on
            ? "bg-[var(--surface)] text-[var(--ink)] shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
            : item.soon
            ? "text-[var(--faint)] hover:bg-[rgba(255,253,248,0.6)]"
            : "text-[var(--muted)] hover:bg-[rgba(255,253,248,0.6)]"
        }`}
      >
        {on && (
          <span
            className="absolute -left-4 bottom-2 top-2 w-[3px] rounded-r bg-[var(--petrol)]"
            aria-hidden
          />
        )}
        <span
          className={`w-4 shrink-0 text-center text-[13px] ${
            on ? "text-[var(--petrol)]" : "text-[var(--faint)]"
          }`}
          aria-hidden
        >
          {item.glyph}
        </span>
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className={`text-[13px] ${on ? "font-semibold" : ""}`}>
            {item.name}
          </span>
          <span className="font-mono text-[8.5px] tracking-tight text-[var(--faint)]">
            {item.tech}
          </span>
        </span>
        {badge && (
          <span
            className={`shrink-0 text-[9.5px] text-[var(--faint)] ${
              item.soon ? "italic" : ""
            }`}
          >
            {badge}
          </span>
        )}
      </button>
    );
  };

  const isAuthoring = AUTHORING_TABS.includes(tab as AuthoringTab);

  return (
    <div
      className="grid h-dvh grid-cols-[252px_1fr] overflow-hidden bg-[var(--paper)] text-[var(--ink)]"
      style={tokenStyle}
    >
      {/* NAV — flat, dual-labeled surfaces, a divider, parked chat, handoff */}
      <nav className="flex h-dvh flex-col overflow-auto border-r border-[var(--line)] bg-[var(--vellum)] px-4 py-5">
        <div className="mb-4 px-1.5">
          <div className="font-serif text-[17px] leading-tight">
            GenUI Studio{" "}
            <span className="font-sans text-[11px] text-[var(--muted)]">
              Daily Tool
            </span>
          </div>
        </div>

        {PRIMARY_NAV.map(renderNavItem)}

        <div className="mx-1.5 my-3 h-px bg-[var(--line)]" />

        {SECONDARY_NAV.map(renderNavItem)}
        {/* Handoff preserved: name what the designer owns and what still needs
            engineering, so the tool never pretends "no code anywhere." */}
        <div className="mt-4 rounded-[9px] border border-dashed border-[var(--line)] px-3 py-2.5 text-[10px] leading-relaxed text-[var(--muted)]">
          You author the{" "}
          <b className="font-semibold text-[var(--ink)]">
            vocabulary, constraints, and visual system
          </b>
          . A genuinely <b className="font-semibold text-[var(--ink)]">new</b>{" "}
          primitive still needs engineering. Your work with the developers
          continues.
        </div>
      </nav>

      {/* MAIN — one surface at a time. Authoring + Notes route into a
          max-width sheet; Preview keeps the full-width playground grid. */}
      <div className="flex h-dvh min-h-0 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 px-10 py-8">
          {isAuthoring && (
            <div className="mx-auto h-full min-h-0 max-w-[820px]">
              {tab === "data" && (
                <DataTab
                  value={data}
                  onChange={setData}
                  context={context}
                  onContextChange={setContext}
                />
              )}
              {tab === "rules" && <RulesTab value={rules} onChange={setRules} />}
              {tab === "catalog" && (
                <CatalogTab
                  enabled={enabled}
                  onToggle={(name, next) =>
                    setEnabled((prev) => ({ ...prev, [name]: next }))
                  }
                  descriptions={descriptions}
                  onDescriptionChange={(name, value) =>
                    setDescriptions((prev) => ({ ...prev, [name]: value }))
                  }
                  onDescriptionReset={(name) =>
                    setDescriptions((prev) => {
                      const next = { ...prev };
                      delete next[name];
                      return next;
                    })
                  }
                />
              )}
              {tab === "style" && (
                <StyleTab tokens={tokens} onChange={setTokens} />
              )}
            </div>
          )}

          {/* Preview (the hero) — freedom-first run flow that collapses after a
              Run, a focal Output module, an always-shown Operations module, and
              the "How Preview works" teaching card (Slice 3a). Run logic is
              unchanged; the two-state Why + render-path control are Slice 3b, and
              the chat relocation is Slice 3c. */}
          {tab === "preview" && (
            <div className="grid h-full min-h-0 grid-cols-1 gap-6 md:grid-cols-[1fr_280px]">
              {/* Main flow: setup -> Output -> Operations -> Why -> teaching card */}
              <div className="flex min-h-0 min-w-0 flex-col gap-4 overflow-y-auto pr-1">
                {/* Setup, freedom-first. Expanded for editing; a compact bar after Run. */}
                {setupExpanded ? (
                  <div className="flex flex-col gap-5 rounded-[var(--dt-radius)] border border-[var(--line)] bg-[var(--surface)] p-4">
                    <div>
                      <div className={railLabel}>Render pattern</div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {PATTERNS.map((p) => {
                          const on = pattern === p;
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setPattern(p)}
                              className={`relative overflow-hidden rounded-[var(--dt-radius)] border bg-[var(--surface)] p-3 text-left transition-colors ${
                                on
                                  ? "border-[var(--ink)]"
                                  : "border-[var(--line)] hover:border-[var(--line-strong)]"
                              }`}
                            >
                              {on && (
                                <span
                                  className="absolute inset-y-0 left-0 w-[3px]"
                                  style={{ background: "var(--dt-brand)" }}
                                  aria-hidden
                                />
                              )}
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="font-serif text-[15px] font-medium">
                                  {PATTERN_CARDS[p].name}
                                </span>
                                <span className="shrink-0 text-[10px] uppercase tracking-wider text-[var(--faint)]">
                                  {PATTERN_CARDS[p].freedom} freedom
                                </span>
                              </div>
                              <p className="mt-0.5 text-xs leading-snug text-[var(--muted)]">
                                {PATTERN_CARDS[p].line}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex items-baseline justify-between">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--faint)]">
                          Style set
                        </span>
                        <span className="text-xs text-[var(--muted)]">
                          {activeSet ?? "Custom"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {STYLE_SETS.map((s) => {
                          const on = activeSet === s.name;
                          return (
                            <button
                              key={s.name}
                              type="button"
                              onClick={() => setTokens(s.tokens)}
                              aria-pressed={on}
                              className={`rounded-[var(--dt-radius)] border px-3 py-1.5 text-sm transition-colors ${
                                on
                                  ? "border-[var(--ink)] font-medium text-[var(--ink)]"
                                  : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--line-strong)]"
                              }`}
                            >
                              {s.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className={railLabel}>Request</div>
                      <textarea
                        className="w-full resize-none rounded-[var(--dt-radius)] border border-[var(--line-strong)] bg-[var(--surface)] p-3 font-mono text-[13px] leading-relaxed text-[var(--ink)] outline-none focus:border-[var(--ink)]"
                        rows={3}
                        value={request}
                        onChange={(e) => setRequest(e.target.value)}
                        onKeyDown={(e) => {
                          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                            e.preventDefault();
                            setSetupExpanded(false);
                            void run();
                          }
                        }}
                        placeholder={DEFAULT_REQUEST}
                        spellCheck={false}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSetupExpanded(false);
                        void run();
                      }}
                      disabled={runState.kind === "running"}
                      className="rounded-[var(--dt-radius)] py-2.5 text-sm font-medium disabled:opacity-50"
                      style={{
                        background: "var(--dt-brand)",
                        color: "var(--dt-brand-contrast)",
                      }}
                    >
                      {runState.kind === "running" ? "Rendering…" : "Run"}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3 rounded-[var(--dt-radius)] border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5">
                    <span className="shrink-0 rounded bg-[var(--petrol)] px-2 py-0.5 text-[11px] font-medium text-white">
                      {PATTERN_CARDS[pattern].name} · {PATTERN_CARDS[pattern].freedom} freedom
                    </span>
                    <span
                      className="min-w-0 flex-1 truncate text-sm text-[var(--muted)]"
                      title={request}
                    >
                      {request || DEFAULT_REQUEST}
                    </span>
                    <div className="ml-auto flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => setSetupExpanded(true)}
                        className="rounded-[var(--dt-radius)] border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--muted)] transition-colors hover:border-[var(--line-strong)]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void run()}
                        disabled={runState.kind === "running"}
                        className="rounded-[var(--dt-radius)] px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                        style={{
                          background: "var(--dt-brand)",
                          color: "var(--dt-brand-contrast)",
                        }}
                      >
                        {runState.kind === "running" ? "Rendering…" : "Re-run"}
                      </button>
                    </div>
                  </div>
                )}

                {runState.kind === "rate-limited" && (
                  <div className="rounded-[var(--dt-radius)] border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    Free-tier rate limit reached (about 10 requests per minute).
                    Wait a few seconds and run again — nothing is broken.
                  </div>
                )}
                {runState.kind === "error" && (
                  <div className="rounded-[var(--dt-radius)] border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    The run failed: {runState.message}
                  </div>
                )}

                {/* Output module — the focal rendered surface */}
                <section>
                  <div className={railLabel}>Output</div>
                  {pattern === "declarative" && (
                    <div className="mb-2 flex items-center gap-2 text-xs">
                      <span className="text-[var(--faint)]">Render path</span>
                      <div className="inline-flex overflow-hidden rounded-[var(--dt-radius)] border border-[var(--line)]">
                        {(
                          [
                            ["simplified", "Simplified"],
                            ["real", "Real A2UI"],
                          ] as const
                        ).map(([key, labelText]) => {
                          const on = (key === "real") === realA2UI;
                          return (
                            <button
                              key={key}
                              type="button"
                              aria-pressed={on}
                              onClick={() => setRealA2UI(key === "real")}
                              className={`px-2.5 py-1 transition-colors ${
                                on
                                  ? "bg-[var(--ink)] font-medium text-[var(--surface)]"
                                  : "text-[var(--muted)] hover:bg-[var(--line)]"
                              }`}
                            >
                              {labelText}
                            </button>
                          );
                        })}
                      </div>
                      {realA2UI && (
                        <span className="text-[var(--faint)]">(experimental)</span>
                      )}
                    </div>
                  )}
                  <div className="rounded-[var(--dt-radius)] border border-[var(--line)] bg-[var(--surface)] p-6">
                    {pattern === "static" && (
                      <StaticPattern
                        blocks={staticBlocks}
                        onBlock={(b) => setStaticBlocks((prev) => [...prev, b])}
                        enabledNames={enabledNames}
                      />
                    )}
                    {pattern === "declarative" &&
                      (realA2UI ? (
                        <>
                          <DeclarativeA2UILive
                            request={a2uiRequest}
                            runNonce={a2uiRunNonce}
                            onReply={handleA2UIReply}
                            onStatus={handleA2UIStatus}
                            onSurface={setA2uiSurfacePresent}
                            onOps={handleA2UIOps}
                          />
                          {a2uiRunNonce === 0 ? (
                            <p className="text-sm text-[var(--faint)]">
                              Real A2UI mode. Run a request to paint a live A2UI
                              surface.
                            </p>
                          ) : runState.kind !== "running" && !a2uiSurfacePresent ? (
                            <p className="text-sm text-[var(--faint)]">
                              The run completed but produced no A2UI surface. Run
                              again — small models occasionally skip the tool call.
                            </p>
                          ) : null}
                        </>
                      ) : (
                        <DeclarativePattern
                          agentText={activeText}
                          enabledNames={enabledNames}
                        />
                      ))}
                    {pattern === "open-ended" && (
                      <OpenEndedPattern agentText={activeText} />
                    )}
                  </div>
                  {commentary ? (
                    <p className="mt-2 text-xs text-[var(--muted)]">{commentary}</p>
                  ) : null}
                </section>

                {/* Operations module — the component tree + bindings the agent
                    emitted, shown as its own module (no toggle). The Catalog
                    "used" view stays reachable. Display-only, derived from
                    activeText / emitted ops — flake-proof. */}
                {pattern === "declarative" && (
                  <section>
                    <div className={railLabel}>Operations</div>
                    <LegibilityView
                      agentText={a2uiActive ? null : activeText}
                      ops={a2uiActive ? a2uiOps : undefined}
                    />
                    <div className="mt-3">
                      <div className={railLabel}>Catalog</div>
                      <CatalogView
                        enabledNames={enabledNames}
                        usedNames={usedNames}
                      />
                    </div>
                  </section>
                )}
                {pattern === "static" && (
                  <section>
                    <div className={railLabel}>Catalog</div>
                    <CatalogView enabledNames={enabledNames} usedNames={usedNames} />
                  </section>
                )}

                <WhyPanel
                  why={why}
                  componentsAllowed={allowed}
                  freedom={PATTERN_CARDS[pattern].freedom}
                  pattern={pattern}
                  realPath={a2uiActive}
                />

                <TeachingCard
                  name="Preview"
                  mechanism={
                    <>
                      Your setup (freedom level + request) runs the agent over your
                      Data, Rules, and Catalog. The agent emits a selection or a
                      spec; the app renders it into the Output above, and the
                      Operations module shows the exact component tree and data
                      bindings it emitted.
                    </>
                  }
                  purpose={
                    <>
                      Freedom leads because it is the real choice you are making:
                      how much you let the agent decide. Everything below the Output
                      is the receipt — what the agent actually produced — so the
                      render stays legible, not magic.
                    </>
                  }
                />
              </div>

              {/* Chat driver: conversational path into the same canvas. Relocation
                  to the nav-foot is Slice 3c. */}
              <ChatPanel
                turns={chatTurns}
                onSend={chatSend}
                disabled={runState.kind === "running"}
              />
            </div>
          )}

          {/* Design Notes — placeholder surface (the decision log lands later). */}
          {tab === "notes" && (
            <div className="mx-auto h-full min-h-0 max-w-[820px]">
              <h2 className="font-serif text-2xl">Design Notes</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                A running narrative of the design decisions behind each render.{" "}
                <span className="text-[var(--faint)]">After June 27.</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  // Catalog state lives here, ABOVE the provider, so the A2UI catalog can be
  // built from it and handed to the provider's `a2ui` prop. The governed catalog
  // is what gives the real-A2UI render its DT primitives + enable/disable
  // governance. `enabled`/`setEnabled`/`enabledNames` flow down to the app.
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(CATALOG.map((c) => [c.name, c.enabled]))
  );
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [catalogHydrated, setCatalogHydrated] = useState(false);
  useEffect(() => {
    try {
      const cat = localStorage.getItem(LS.catalog);
      if (cat) {
        const parsed = JSON.parse(cat);
        if (parsed && typeof parsed === "object") {
          setEnabled((prev) => ({ ...prev, ...parsed }));
        }
      }
      const desc = localStorage.getItem(LS.catalogDescriptions);
      if (desc) {
        const parsedDesc = JSON.parse(desc);
        if (parsedDesc && typeof parsedDesc === "object") {
          setDescriptions(parsedDesc);
        }
      }
    } catch {
      /* ignore malformed / private mode */
    }
    setCatalogHydrated(true);
  }, []);
  useEffect(() => {
    if (!catalogHydrated) return;
    try {
      localStorage.setItem(LS.catalog, JSON.stringify(enabled));
      localStorage.setItem(LS.catalogDescriptions, JSON.stringify(descriptions));
    } catch {
      /* non-fatal */
    }
  }, [catalogHydrated, enabled, descriptions]);

  const enabledNames = useMemo(
    () =>
      new Set(
        Object.entries(enabled)
          .filter(([, on]) => on)
          .map(([name]) => name)
      ),
    [enabled]
  );
  const a2uiCatalog = useMemo(() => buildCatalog(enabledNames), [enabledNames]);

  return (
    <CopilotKitProvider
      runtimeUrl="/api/copilotkit"
      showDevConsole={false}
      a2ui={{ theme: A2UI_THEME, catalog: a2uiCatalog }}
    >
      <DailyToolInner
        enabled={enabled}
        setEnabled={setEnabled}
        enabledNames={enabledNames}
        descriptions={descriptions}
        setDescriptions={setDescriptions}
      />
    </CopilotKitProvider>
  );
}
