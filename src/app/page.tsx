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
import { StyleTab, DEFAULT_TOKENS, type StyleTokens } from "@/components/StyleTab";
import { WhyPanel } from "@/components/WhyPanel";
import { StaticPattern, type StaticBlock } from "@/components/StaticPattern";
import { DeclarativePattern } from "@/components/DeclarativePattern";
import { OpenEndedPattern } from "@/components/OpenEndedPattern";
import {
  CATALOG,
  allowedComponentNames,
  catalogPromptText,
  commentaryOf,
  parseWhy,
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
type Tab = "data" | "rules" | "catalog" | "style" | Pattern;

const TAB_LABELS: Record<Tab, string> = {
  data: "Data",
  rules: "Rules",
  catalog: "Catalog",
  style: "Style",
  static: "Static",
  declarative: "Declarative",
  "open-ended": "Open-Ended",
};

const LS = {
  data: "daily-tool:v1:data",
  rules: "daily-tool:v1:rules",
  request: "daily-tool:v1:request",
  catalog: "daily-tool:v1:catalog",
  style: "daily-tool:v1:style",
  temperature: "daily-tool:v1:temperature",
};

/** One honest sentence per pattern: who designs, what constrains the agent. */
const PATTERN_EXPLAINERS: Record<Pattern, { title: string; body: string }> = {
  static: {
    title: "Static — you built the components, the agent fills them",
    body: "The agent can only pick from your pre-built components and pour your data into them. Nothing you didn't build can appear. Most predictable, least flexible.",
  },
  declarative: {
    title: "Declarative — the agent proposes, your catalog approves",
    body: "The agent writes a UI spec; a trusted renderer assembles it from your component catalog. Anything outside the catalog is rejected — and you'll see the rejection. The middle path.",
  },
  "open-ended": {
    title: "Open-Ended — the agent invents the surface",
    body: "No catalog. The agent generates the interface itself (sandboxed), and only the rules you wrote constrain it. Most flexible, least guaranteed.",
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

  const [tab, setTab] = useState<Tab>("data");
  const [pattern, setPattern] = useState<Pattern>("static");
  const [data, setData] = useState(DEFAULT_DATA);
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [request, setRequest] = useState(DEFAULT_REQUEST);
  const [runState, setRunState] = useState<RunState>({ kind: "idle" });
  const [staticBlocks, setStaticBlocks] = useState<StaticBlock[]>([]);
  const [agentText, setAgentText] = useState<Partial<Record<Pattern, string>>>({});

  // --- the three levers (Pass 3a) -----------------------------------------
  // Catalog breadth: which components the agent may use. Seeded from the
  // catalog's static defaults; the Catalog tab flips entries at runtime.
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(CATALOG.map((c) => [c.name, c.enabled]))
  );
  // Visual style: design tokens, applied as CSS custom properties below.
  const [tokens, setTokens] = useState<StyleTokens>(DEFAULT_TOKENS);
  // Temperature: how freely the agent varies its output (backend default 0.4).
  const [temperature, setTemperature] = useState(0.4);

  // --- persistence (survives reload; criterion 2 + Pass 3a persistence) ---
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
      const tmp = localStorage.getItem(LS.temperature);
      if (tmp !== null) {
        const n = Number(tmp);
        if (!Number.isNaN(n)) setTemperature(n);
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
      localStorage.setItem(LS.temperature, String(temperature));
    } catch {
      /* non-fatal */
    }
  }, [hydrated, data, rules, request, enabled, tokens, temperature]);

  // The enabled set, derived once per change — threaded everywhere catalog
  // enablement is read so toggles are live, not load-time snapshots.
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
  useAgentContext({
    description: "Active pattern",
    value: pattern,
  });
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
  const run = useCallback(async () => {
    if (runState.kind === "running" || !request.trim()) return;
    setRunState({ kind: "running" });
    if (pattern === "static") setStaticBlocks([]);
    setAgentText((prev) => ({ ...prev, [pattern]: undefined }));
    try {
      agent.setMessages([]);
      agent.addMessage({
        id: crypto.randomUUID(),
        role: "user",
        content: request,
      });
      await copilotkit.runAgent({
        agent,
        // Static: tool calls ARE the pattern. Declarative / Open-Ended:
        // text-only — blocking tools keeps smaller models from drifting
        // into the built-in state tools instead of emitting the spec.
        // temperature is the creativity lever (overridable on the agent).
        forwardedProps: {
          toolChoice: pattern === "static" ? "auto" : "none",
          temperature,
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
      setAgentText((prev) => ({
        ...prev,
        [pattern]: (lastAssistant?.content as string) ?? "",
      }));
      setRunState({ kind: "idle" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/429|rate.?limit|quota|RESOURCE_EXHAUSTED/i.test(message)) {
        setRunState({ kind: "rate-limited" });
      } else {
        setRunState({ kind: "error", message });
      }
    }
  }, [agent, copilotkit, pattern, request, runState.kind, temperature]);

  const isPatternTab = PATTERNS.includes(tab as Pattern);
  const activeText = agentText[pattern] ?? null;
  const why = activeText ? parseWhy(activeText) : null;
  const commentary = activeText ? commentaryOf(activeText) : "";
  // App truth, not the model's claim: what this pattern actually allows.
  const allowed = allowedComponentNames(pattern, enabledNames);

  // Style tokens applied as CSS custom properties on the app root. The
  // globals.css :root defaults remain as the reset baseline.
  const tokenStyle = {
    "--dt-brand": tokens.brand,
    "--dt-brand-contrast": tokens.brandContrast,
    "--dt-border": tokens.border,
    "--dt-radius": tokens.radius,
    "--dt-gap": tokens.gap,
  } as CSSProperties;

  return (
    <main
      className="mx-auto flex h-dvh max-w-5xl flex-col px-4 py-6"
      style={tokenStyle}
    >
      <header className="mb-4">
        <h1 className="text-xl font-semibold">Daily Tool</h1>
        <p className="text-sm text-neutral-500">
          Your data, your rules — three ways an agent can render the same
          request. Coffee &amp; Claude: GenUI Challenge.
        </p>
      </header>

      {/* Tab row */}
      <nav className="mb-4 flex gap-1 border-b border-neutral-200">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => {
          const isPattern = PATTERNS.includes(t as Pattern);
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                if (isPattern) setPattern(t as Pattern);
              }}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
                active
                  ? "border-[var(--dt-brand)] text-neutral-900"
                  : "border-transparent text-neutral-500 hover:text-neutral-700"
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          );
        })}
      </nav>

      <div className="min-h-0 flex-1">
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

        {isPatternTab && (
          <div className="flex h-full min-h-0 flex-col gap-4">
            {/* Pattern explainer */}
            <div className="rounded-lg bg-neutral-50 px-4 py-3">
              <div className="text-sm font-semibold">
                {PATTERN_EXPLAINERS[pattern].title}
              </div>
              <p className="mt-0.5 text-sm text-neutral-600">
                {PATTERN_EXPLAINERS[pattern].body}
              </p>
            </div>

            {/* Request bar */}
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void run();
              }}
            >
              <input
                className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
                value={request}
                onChange={(e) => setRequest(e.target.value)}
                placeholder={DEFAULT_REQUEST}
              />
              <button
                type="submit"
                disabled={runState.kind === "running"}
                className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--dt-brand-contrast)] disabled:opacity-50"
                style={{ background: "var(--dt-brand)" }}
              >
                {runState.kind === "running" ? "Rendering…" : "Run"}
              </button>
            </form>

            {/* Temperature — lever 3 of 3 (creativity) */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
              <label className="flex items-center gap-2">
                <span className="font-medium text-neutral-700">
                  Creativity (temperature)
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  aria-label="Temperature: how freely the agent varies its output"
                />
                <span className="w-6 tabular-nums">{temperature.toFixed(1)}</span>
              </label>
              <span>
                Lower = predictable and repeatable. Higher = more variation. The
                same lever the agent uses to play versus converge.
              </span>
            </div>

            {/* What this run tests */}
            <p className="text-xs text-neutral-500">
              This run tests{" "}
              <button
                type="button"
                className="underline decoration-dotted underline-offset-2"
                onClick={() => setTab("rules")}
              >
                {rules.split("\n").filter((l) => l.trim().startsWith("-")).length}{" "}
                rules
              </button>{" "}
              against{" "}
              <button
                type="button"
                className="underline decoration-dotted underline-offset-2"
                onClick={() => setTab("data")}
              >
                your data ({data.trim() ? data.trim().split("\n").length : 0} lines)
              </button>
              {pattern !== "open-ended" ? (
                <>
                  {" "}
                  with{" "}
                  <button
                    type="button"
                    className="underline decoration-dotted underline-offset-2"
                    onClick={() => setTab("catalog")}
                  >
                    {allowed.length} allowed components
                  </button>
                </>
              ) : (
                <> with no catalog — rules only</>
              )}
              . Same request, different tab, different contract.
            </p>

            {/* Run status (criterion 6: rate limits surface, never a silent hang) */}
            {runState.kind === "rate-limited" && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Free-tier rate limit reached (about 10 requests per minute).
                Wait a few seconds and run again — nothing is broken.
              </div>
            )}
            {runState.kind === "error" && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                The run failed: {runState.message}
              </div>
            )}

            {/* Preview + why panel */}
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto md:grid-cols-3">
              <section className="md:col-span-2">
                <div className="rounded-lg border border-neutral-200 p-4">
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
                  <p className="mt-2 text-xs text-neutral-500">{commentary}</p>
                ) : null}
              </section>
              <WhyPanel why={why} componentsAllowed={allowed} />
            </div>
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
