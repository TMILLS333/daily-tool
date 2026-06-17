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

import { DataTab } from "@/components/DataTab";
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
import { ChatPanel, type ChatTurn } from "@/components/ChatPanel";
import { StaticPattern, type StaticBlock } from "@/components/StaticPattern";
import { DeclarativePattern } from "@/components/DeclarativePattern";
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
} from "@/lib/catalog";
import { DEFAULT_DATA, DEFAULT_REQUEST, DEFAULT_RULES } from "@/lib/default-rules";

// Workaround for an upstream bug: @ag-ui/client stores the global `fetch`
// on its agent instance and calls it as a method (`this.fetch(...)`), which
// browsers reject with "Illegal invocation". Binding fetch to window before
// the agent is constructed makes the stored reference safe to call.
// Remove once fixed upstream in @ag-ui/client.
if (typeof window !== "undefined") {
  window.fetch = window.fetch.bind(window);
}

const PATTERNS = ["static", "declarative", "open-ended"] as const;
type Pattern = (typeof PATTERNS)[number];
type AuthoringTab = "data" | "rules" | "catalog" | "style";
type Tab = AuthoringTab | "preview";

const AUTHORING_TABS: AuthoringTab[] = ["data", "rules", "catalog", "style"];
const TAB_LABELS: Record<Tab, string> = {
  data: "Data",
  rules: "Rules",
  catalog: "Catalog",
  style: "Style",
  preview: "Preview",
};

const LS = {
  data: "daily-tool:v1:data",
  rules: "daily-tool:v1:rules",
  request: "daily-tool:v1:request",
  catalog: "daily-tool:v1:catalog",
  style: "daily-tool:v1:style",
};

/** One short line per pattern for the rail's selectable cards: who designs,
    what constrains the agent. */
const PATTERN_CARDS: Record<Pattern, { name: string; line: string }> = {
  static: {
    name: "Controlled",
    line: "You built the components. The agent fills them.",
  },
  declarative: {
    name: "Declarative",
    line: "The agent proposes a spec. Your catalog approves.",
  },
  "open-ended": {
    name: "Open-ended",
    line: "No catalog. The agent invents the surface.",
  },
};

type RunState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "rate-limited" }
  | { kind: "error"; message: string };

function DailyTool() {
  const { copilotkit } = useCopilotKit();
  const { agent } = useAgent();

  const [tab, setTab] = useState<Tab>("preview");
  const [pattern, setPattern] = useState<Pattern>("static");
  const [data, setData] = useState(DEFAULT_DATA);
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [request, setRequest] = useState(DEFAULT_REQUEST);
  const [runState, setRunState] = useState<RunState>({ kind: "idle" });
  const [staticBlocks, setStaticBlocks] = useState<StaticBlock[]>([]);
  const [agentText, setAgentText] = useState<Partial<Record<Pattern, string>>>({});
  const [chatTurns, setChatTurns] = useState<ChatTurn[]>([]);
  // Which reveal facet is showing for Declarative (Operations spec vs Catalog).
  const [revealFacet, setRevealFacet] = useState<"spec" | "catalog">("spec");

  // --- the three levers (Pass 3a) -----------------------------------------
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(CATALOG.map((c) => [c.name, c.enabled]))
  );
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

      const cat = localStorage.getItem(LS.catalog);
      if (cat) {
        try {
          const parsed = JSON.parse(cat);
          if (parsed && typeof parsed === "object") {
            setEnabled((prev) => ({ ...prev, ...parsed }));
          }
        } catch {
          /* ignore malformed */
        }
      }
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
      localStorage.setItem(LS.catalog, JSON.stringify(enabled));
      localStorage.setItem(LS.style, JSON.stringify(tokens));
    } catch {
      /* non-fatal */
    }
  }, [hydrated, data, rules, request, enabled, tokens]);

  const enabledNames = useMemo(
    () =>
      new Set(
        Object.entries(enabled)
          .filter(([, on]) => on)
          .map(([name]) => name)
      ),
    [enabled]
  );

  // --- application context: what the agent knows on every run -------------
  const catalogText = useMemo(
    () => catalogPromptText(enabledNames),
    [enabledNames]
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

  // Run button: clears the chat transcript so the canvas reflects exactly this
  // request, then runs it through the shared path.
  const run = useCallback(() => {
    if (!request.trim()) return;
    setChatTurns([]);
    void runMessage(request);
  }, [request, runMessage]);

  // Chat: appends each exchange to the transcript and renders into the same
  // canvas through the shared path.
  const chatSend = useCallback(
    (text: string) => {
      setChatTurns((prev) => [...prev, { role: "user", text }]);
      void runMessage(text).then((reply) => {
        const line =
          reply === null
            ? "That run did not complete. Check the canvas note and try again."
            : commentaryOf(reply) || "Rendered into the canvas.";
        setChatTurns((prev) => [...prev, { role: "assistant", text: line }]);
      });
    },
    [runMessage]
  );

  const activeText = agentText[pattern] ?? null;
  const why = activeText ? parseWhy(activeText) : null;
  const commentary = activeText ? commentaryOf(activeText) : "";
  // App truth, not the model's claim: what this pattern actually allows.
  const allowed = allowedComponentNames(pattern, enabledNames);
  // App truth: which catalog entries the CURRENT render used. Controlled reads
  // the rendered blocks; Declarative walks the emitted spec. Drives the Catalog
  // facet's "used" marks. Open-Ended has no catalog, so the set stays empty.
  const usedNames = useMemo<Set<string>>(() => {
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
  }, [pattern, staticBlocks, activeText]);
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

  return (
    <main
      className="mx-auto flex h-dvh max-w-5xl flex-col px-5 py-6"
      style={tokenStyle}
    >
      {/* Header */}
      <header className="flex items-baseline justify-between border-b border-[var(--line)] pb-3">
        <div className="flex items-baseline gap-2.5">
          <span className="font-serif text-xl font-medium tracking-tight">
            GenUI Studio
          </span>
          <span className="text-sm text-[var(--faint)]">Daily Tool</span>
        </div>
        <span className="text-sm text-[var(--faint)]">
          Coffee &amp; Claude: GenUI Challenge
        </span>
      </header>

      {/* Tab row — authoring tabs + the Preview playground */}
      <nav className="mt-3 flex gap-6 border-b border-[var(--line)]">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 pb-2.5 text-sm transition-colors ${
                active
                  ? "border-[var(--ink)] font-medium text-[var(--ink)]"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          );
        })}
      </nav>

      <div className="mt-5 min-h-0 flex-1">
        {/* Authoring tabs */}
        {AUTHORING_TABS.includes(tab as AuthoringTab) && (
          <div className="h-full min-h-0">
            {tab === "data" && <DataTab value={data} onChange={setData} />}
            {tab === "rules" && <RulesTab value={rules} onChange={setRules} />}
            {tab === "catalog" && (
              <CatalogTab
                enabled={enabled}
                onToggle={(name, next) =>
                  setEnabled((prev) => ({ ...prev, [name]: next }))
                }
              />
            )}
            {tab === "style" && <StyleTab tokens={tokens} onChange={setTokens} />}
          </div>
        )}

        {/* Preview playground — config rail + output canvas */}
        {tab === "preview" && (
          <div className="grid h-full min-h-0 grid-cols-1 gap-6 md:grid-cols-[224px_1fr_280px]">
            {/* Config rail: pattern -> style -> request -> Run */}
            <div className="flex min-h-0 flex-col gap-6 overflow-y-auto pr-1">
              <div>
                <div className={railLabel}>Render pattern</div>
                <div className="flex flex-col gap-2">
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
                        <div className="font-serif text-[15px] font-medium">
                          {PATTERN_CARDS[p].name}
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
                      void run();
                    }
                  }}
                  placeholder={DEFAULT_REQUEST}
                  spellCheck={false}
                />
              </div>

              <button
                type="button"
                onClick={() => void run()}
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

            {/* Output canvas — the focal point (the hero, middle zone) */}
            <div className="flex min-h-0 min-w-0 flex-col gap-4 overflow-y-auto">
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

              <section>
                <div className="rounded-[var(--dt-radius)] border border-[var(--line)] bg-[var(--surface)] p-6">
                  {pattern === "static" && (
                    <StaticPattern
                      blocks={staticBlocks}
                      onBlock={(b) => setStaticBlocks((prev) => [...prev, b])}
                      enabledNames={enabledNames}
                    />
                  )}
                  {pattern === "declarative" && (
                    <DeclarativePattern
                      agentText={activeText}
                      enabledNames={enabledNames}
                    />
                  )}
                  {pattern === "open-ended" && (
                    <OpenEndedPattern agentText={activeText} />
                  )}
                </div>
                {commentary ? (
                  <p className="mt-2 text-xs text-[var(--muted)]">{commentary}</p>
                ) : null}
              </section>

              {/* Reveal facets: the emitted operations (Declarative) and the
                  catalog the agent could reach for (Controlled + Declarative).
                  Display-only, derived from activeText / blocks — flake-proof. */}
              {(pattern === "declarative" || pattern === "static") && (
                <div className="flex flex-col gap-2">
                  {pattern === "declarative" && (
                    <div className="flex gap-2">
                      {(["spec", "catalog"] as const).map((f) => {
                        const on = revealFacet === f;
                        return (
                          <button
                            key={f}
                            type="button"
                            onClick={() => setRevealFacet(f)}
                            aria-pressed={on}
                            className={`rounded-[var(--dt-radius)] border px-2.5 py-1 text-xs transition-colors ${
                              on
                                ? "border-[var(--ink)] font-medium text-[var(--ink)]"
                                : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--line-strong)]"
                            }`}
                          >
                            {f === "spec" ? "Operations" : "Catalog"}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {pattern === "declarative" && revealFacet === "spec" && (
                    <LegibilityView agentText={activeText} />
                  )}
                  {(pattern === "static" ||
                    (pattern === "declarative" && revealFacet === "catalog")) && (
                    <CatalogView enabledNames={enabledNames} usedNames={usedNames} />
                  )}
                </div>
              )}

              <WhyPanel why={why} componentsAllowed={allowed} />
            </div>

            {/* Chat driver: conversational path into the same canvas. */}
            <ChatPanel
              turns={chatTurns}
              onSend={chatSend}
              disabled={runState.kind === "running"}
            />
          </div>
        )}
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <CopilotKitProvider runtimeUrl="/api/copilotkit" showDevConsole={false}>
      <DailyTool />
    </CopilotKitProvider>
  );
}
