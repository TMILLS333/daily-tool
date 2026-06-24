"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
  DEFAULT_TOKENS,
  type StyleTokens,
} from "@/components/StyleTab";
import { WhyPanel } from "@/components/WhyPanel";
import { TeachingCard } from "@/components/TeachingCard";
import { ChatPanel, type ChatTurn } from "@/components/ChatPanel";
import { StaticPattern, type StaticBlock } from "@/components/StaticPattern";
import { DeclarativePattern } from "@/components/DeclarativePattern";
import { DeclarativeA2UILive } from "@/components/DeclarativeA2UILive";
import { EmergenceTimeline, type EmergenceBeat } from "@/components/EmergenceTimeline";
import { LegibilityView } from "@/components/LegibilityView";
import { OpenEndedPattern } from "@/components/OpenEndedPattern";
import { RightDock, type LayerStatus } from "@/components/RightDock";
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
  // "How Preview works" is render-first: collapsed by default, revealed on
  // demand (Pass 2 declutter) so the render leads, not the explainer.
  const [howPreviewOpen, setHowPreviewOpen] = useState(false);
  // Parked chat lives in the nav, collapsed by default (Slice 3c), so the
  // dashed handoff note stays the closing beat.
  const [chatOpen, setChatOpen] = useState(false);

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

  // --- emergence timeline (live capture, paced replay) --------------------
  // Each run records the agent's real event beats (start, compose, tool calls,
  // finish) with elapsed timestamps via agent.subscribe; the reveal in
  // the rail (EmergenceTimeline) replays them at a paced cadence. Capture is
  // live; only the playback is staged. Cleared at the start of every run so the
  // timeline always reflects this run. The real-A2UI island (Slice 2) is not
  // captured, so its run clears these instead.
  const [beats, setBeats] = useState<EmergenceBeat[]>([]);

  // --- stop control -------------------------------------------------------
  // stopNonce signals the real-A2UI island (which owns its own agent) to abort.
  // stoppingRef tells the active run's terminal handler that an incoming abort
  // error is a user Stop, so it resolves to a clean idle rather than an error.
  const [stopNonce, setStopNonce] = useState(0);
  const stoppingRef = useRef(false);

  // --- the three levers (Pass 3a) -----------------------------------------
  // `enabled` / `setEnabled` / `enabledNames` are lifted to <Home> (above the
  // provider) so the A2UI catalog can be built from them; they arrive as props.
  const [tokens, setTokens] = useState<StyleTokens>(DEFAULT_TOKENS);

  // --- run-lifecycle save-states (Pass 4) ---------------------------------
  // Each layer reports applied / pending / live to the right dock. "Applied"
  // is the snapshot of Data/Rules/Catalog captured when a run last succeeded;
  // a layer goes "pending" once its live value diverges from that snapshot.
  // Theme is always "live" (tokens apply immediately via CSS, no run needed).
  // A latest-values ref feeds the capture so the run callbacks (whose deps
  // exclude data/rules) snapshot current values, not a stale closure.
  const catalogKey = useMemo(
    () => JSON.stringify({ enabled: [...enabledNames].sort(), descriptions }),
    [enabledNames, descriptions]
  );
  const [applied, setApplied] = useState<{
    data: string;
    rules: string;
    catalog: string;
  } | null>(null);
  const latestLayersRef = useRef({ data, rules, catalog: catalogKey });
  useEffect(() => {
    latestLayersRef.current = { data, rules, catalog: catalogKey };
  }, [data, rules, catalogKey]);
  // The request input, focused when the pending hint is activated.
  const requestRef = useRef<HTMLTextAreaElement>(null);

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
      setBeats([]);

      // Live-capture the agent's event beats for the "How this UI emerged"
      // reveal. Accumulate into a local array (not state) so the run does not
      // re-render on every event; commit once in `finally`. Timestamps are
      // real, relative to run start. EmergenceTimeline paces the replay.
      const captured: EmergenceBeat[] = [];
      const runStart = Date.now();
      let composed = false;
      let started = false;
      let ok = false;
      // void return: the subscriber callbacks expect AgentStateMutation | void,
      // so mark must not leak Array.push's number return.
      const mark = (
        kind: EmergenceBeat["kind"],
        label: string,
        detail?: string
      ) => {
        captured.push({
          id: crypto.randomUUID(),
          kind,
          label,
          detail,
          at: Math.max(0, Date.now() - runStart),
        });
      };
      const sub = agent.subscribe({
        // The agentic loop fires RUN_STARTED once per model round. The first is
        // the real start (the agent reading your inputs); a later round is the
        // agent processing the tool results to compose its answer.
        onRunStartedEvent: () => {
          if (!started) {
            started = true;
            mark("start", "Started", "Read your data, rules, and catalog");
          } else {
            mark("start", "Continued", "Processed the tool results");
          }
        },
        onTextMessageStartEvent: () => {
          if (!composed) {
            composed = true;
            mark("think", "Composing the response");
          }
        },
        onToolCallStartEvent: ({ event }) =>
          mark("tool", `Called ${event.toolCallName}`, "Agent invoked a tool"),
      });

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
        setApplied(latestLayersRef.current);
        setRunState({ kind: "idle" });
        ok = true;
        return reply;
      } catch (err) {
        if (stoppingRef.current) return null; // user Stop; state already idle
        const message = err instanceof Error ? err.message : String(err);
        if (/429|rate.?limit|quota|RESOURCE_EXHAUSTED/i.test(message)) {
          setRunState({ kind: "rate-limited" });
        } else {
          setRunState({ kind: "error", message });
        }
        return null;
      } finally {
        sub.unsubscribe();
        mark(
          "finish",
          stoppingRef.current
            ? "Stopped"
            : ok
              ? "Finished"
              : "Run did not complete"
        );
        stoppingRef.current = false;
        setBeats(captured);
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
    // The island path is not beat-captured in Slice 1; clear so no stale
    // main-path timeline shows under a real-A2UI run.
    setBeats([]);
    setA2uiRequest(text);
    setA2uiRunNonce((n) => n + 1);
  }, []);

  // The island's run lifecycle maps onto the same run banner as the default path.
  const handleA2UIStatus = useCallback(
    (status: "running" | "complete" | "error", message?: string) => {
      if (status === "running") {
        setRunState({ kind: "running" });
        return;
      }
      // Terminal (complete | error). A user Stop lands here as an abort error;
      // swallow it into a clean idle instead of surfacing an error banner.
      if (stoppingRef.current) {
        stoppingRef.current = false;
        setRunState({ kind: "idle" });
        return;
      }
      if (status === "complete") {
        setApplied(latestLayersRef.current);
        setRunState({ kind: "idle" });
      } else {
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

  // Stop the in-flight run. Aborts the page agent (Controlled /
  // Declarative-simplified / Open-ended) and signals the real-A2UI island to
  // abort its own agent via stopNonce. Sets idle at once for snappy feedback;
  // stoppingRef makes the run's terminal handler resolve to a clean stop, not an
  // error. abortRun halts the client wait + further tool calls; it cannot
  // guarantee provider tokens already streaming are cancelled.
  const stop = useCallback(() => {
    if (runState.kind !== "running") return;
    stoppingRef.current = true;
    try {
      agent.abortRun();
    } catch {
      /* nothing to abort on the page agent (e.g. an island run is active) */
    }
    setStopNonce((n) => n + 1);
    setRunState({ kind: "idle" });
  }, [agent, runState.kind]);

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

  // Real-A2UI catalog enforcement, made visible (parity with the simplified
  // DeclarativePattern). The agent can still NAME a disabled or off-catalog
  // component (its injected tool schema is the full vocabulary), but the client
  // catalog only renders the enabled subset, so such a node would paint as the
  // renderer's raw "Unknown component" with no honest framing. Here we read the
  // emitted types and list the rejections the same way the simplified path does.
  // Stack is a container the catalog always keeps, so it is never a rejection.
  const a2uiRejections = useMemo<string[]>(() => {
    if (!a2uiActive) return [];
    const alwaysKeep = new Set(["Stack"]); // mirrors buildCatalog ALWAYS_KEEP
    const catalogNames = new Set(CATALOG.map((c) => c.name));
    const problems: string[] = [];
    for (const name of usedNames) {
      if (alwaysKeep.has(name)) continue;
      if (!catalogNames.has(name)) {
        problems.push(`"${name}" is not in the catalog — not rendered.`);
      } else if (!enabledNames.has(name)) {
        problems.push(`"${name}" is disabled — not rendered.`);
      }
    }
    return problems;
  }, [a2uiActive, usedNames, enabledNames]);

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

  const isAuthoring = AUTHORING_TABS.includes(tab as AuthoringTab);

  // Pending = a layer changed since the applied snapshot (the last successful
  // render). Before the first run (applied === null) nothing is pending.
  const pendingLayers: string[] = [];
  if (applied) {
    if (applied.data !== data) pendingLayers.push("Data");
    if (applied.rules !== rules) pendingLayers.push("Rules");
    if (applied.catalog !== catalogKey) pendingLayers.push("Catalog");
  }
  const layerStatus: Record<AuthoringTab, LayerStatus> = {
    data: pendingLayers.includes("Data") ? "pending" : "applied",
    rules: pendingLayers.includes("Rules") ? "pending" : "applied",
    catalog: pendingLayers.includes("Catalog") ? "pending" : "applied",
    style: "live",
  };

  return (
    <div
      className="flex min-h-dvh bg-[var(--paper)] text-[var(--ink)]"
      style={tokenStyle}
    >
      {/* CANVAS — primary surface, fills the width. The render is the canvas;
          authoring layers open from the right dock (interim surface-swap this
          slice). The retired left <nav> tab-router lived here pre-v3. */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Canvas chrome top bar: the wordmark doubles as "home" (→ Preview),
            plus the two surfaces the dock does not hold — Design Notes and the
            parked Chat — so removing the nav strands neither. */}
        <header className="sticky top-0 z-30 flex shrink-0 items-center justify-between border-b border-[var(--line)] bg-[var(--paper)] px-10 py-3">
          <button
            type="button"
            onClick={() => setTab("preview")}
            className="font-serif text-[17px] leading-tight"
            aria-label="GenUI Studio — back to Preview"
          >
            GenUI Studio{" "}
            <span className="font-sans text-[11px] text-[var(--muted)]">
              Daily Tool
            </span>
          </button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTab(tab === "notes" ? "preview" : "notes")}
              aria-pressed={tab === "notes"}
              className={`rounded-[9px] px-3 py-1.5 text-[12px] transition-colors ${
                tab === "notes"
                  ? "bg-[var(--surface)] text-[var(--ink)] shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
                  : "text-[var(--muted)] hover:bg-[rgba(255,253,248,0.6)]"
              }`}
            >
              Design Notes{" "}
              <span className="text-[var(--faint)]">soon</span>
            </button>
            <button
              type="button"
              onClick={() => setChatOpen((o) => !o)}
              aria-expanded={chatOpen}
              className={`rounded-[9px] px-3 py-1.5 text-[12px] transition-colors ${
                chatOpen
                  ? "bg-[var(--surface)] text-[var(--ink)] shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
                  : "text-[var(--muted)] hover:bg-[rgba(255,253,248,0.6)]"
              }`}
            >
              <span aria-hidden>✦</span> Chat
            </button>
          </div>
        </header>

        <div className="px-10 py-8">
          {isAuthoring && (
            <div className="mx-auto max-w-[820px]">
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

          {/* Preview (the hero) — full-bleed freedom-first run flow + focal Output
              + Operations module + composable two-state Why + "How Preview works"
              card. Chat relocated to the nav's parked slot (Slice 3c); run logic
              unchanged. */}
          {tab === "preview" && (
            <div className="flex min-w-0 flex-col gap-4">
                {/* Consolidated setup (Pass 3): a compact, visible freedom
                    control + one persistent input whose inline arrow is the
                    only run trigger. Replaces the pattern-cards / theme-set /
                    request / Run / Edit-Re-run stack. Freedom stays visible
                    (freedom leads); theme moved to the dock Theme tile. */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--faint)]">
                      Freedom
                    </span>
                    <div className="inline-flex overflow-hidden rounded-[var(--dt-radius)] border border-[var(--line)]">
                      {PATTERNS.map((p) => {
                        const on = pattern === p;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPattern(p)}
                            aria-pressed={on}
                            title={PATTERN_CARDS[p].line}
                            className={`flex items-baseline gap-1.5 px-3 py-1.5 text-sm transition-colors ${
                              on
                                ? "bg-[var(--ink)] font-medium text-[var(--surface)]"
                                : "text-[var(--muted)] hover:bg-[var(--line)]"
                            }`}
                          >
                            {PATTERN_CARDS[p].name}
                            <span
                              className={`text-[9px] uppercase tracking-wider ${
                                on ? "text-[var(--surface)]" : "text-[var(--faint)]"
                              }`}
                            >
                              {PATTERN_CARDS[p].freedom}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-end gap-2 rounded-[var(--dt-radius)] border border-[var(--line-strong)] bg-[var(--surface)] p-2 transition-colors focus-within:border-[var(--ink)]">
                    <textarea
                      ref={requestRef}
                      className="min-h-[44px] w-full resize-none bg-transparent px-2 py-1.5 font-mono text-[13px] leading-relaxed text-[var(--ink)] outline-none"
                      rows={2}
                      value={request}
                      onChange={(e) => setRequest(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                          e.preventDefault();
                          void run();
                        }
                      }}
                      placeholder="Describe what you want from your data…"
                      spellCheck={false}
                    />
                    <button
                      type="button"
                      aria-label={runState.kind === "running" ? "Stop" : "Run"}
                      onClick={runState.kind === "running" ? stop : () => void run()}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--dt-radius)] text-base font-medium transition-colors ${
                        runState.kind === "running" ? "animate-pulse" : ""
                      }`}
                      style={
                        runState.kind === "running"
                          ? { background: "var(--line)", color: "var(--ink)" }
                          : {
                              background: "var(--dt-brand)",
                              color: "var(--dt-brand-contrast)",
                            }
                      }
                    >
                      {runState.kind === "running" ? "■" : "→"}
                    </button>
                  </div>
                </div>

                {/* Pending hint (Pass 4): the render is behind your edits.
                    Names the changed layers; activating focuses the input so
                    you can run. No auto-rerun. Amber = the app's warning tone. */}
                {pendingLayers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => requestRef.current?.focus()}
                    className="flex w-full items-center gap-2 rounded-[var(--dt-radius)] border border-amber-200 bg-amber-50 px-4 py-2.5 text-left text-sm text-amber-800 transition-colors hover:bg-amber-100"
                  >
                    <span aria-hidden>!</span>
                    <span>
                      {pendingLayers.join(", ")} changed since this render ·{" "}
                      <span className="font-medium">run to update</span>
                    </span>
                  </button>
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
                    {runState.kind === "running" && (
                      <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 text-[var(--muted)]">
                        <span
                          className="h-3 w-3 animate-pulse rounded-full bg-[var(--petrol)]"
                          aria-hidden
                        />
                        <span className="text-sm">Building your interface…</span>
                      </div>
                    )}
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
                            stopNonce={stopNonce}
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
                          {a2uiRejections.length > 0 ? (
                            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                              <div className="text-xs font-semibold text-amber-800">
                                Catalog enforcement — rejected by your component vocabulary
                              </div>
                              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-amber-700">
                                {a2uiRejections.map((p, i) => (
                                  <li key={i}>{p}</li>
                                ))}
                              </ul>
                            </div>
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

                {/* Operations module: the component tree + bindings the agent
                    emitted, shown as its own module (no toggle). Display-only,
                    derived from activeText / emitted ops, flake-proof. The
                    "Catalog used" view was removed from the canvas (Pass 2
                    declutter); the vocabulary lives in the Catalog dock layer. */}
                {pattern === "declarative" && (
                  <section>
                    <div className={railLabel}>Operations</div>
                    <LegibilityView
                      agentText={a2uiActive ? null : activeText}
                      ops={a2uiActive ? a2uiOps : undefined}
                    />
                  </section>
                )}

                <EmergenceTimeline beats={beats} />

                <WhyPanel
                  why={why}
                  componentsAllowed={allowed}
                  freedom={PATTERN_CARDS[pattern].freedom}
                  pattern={pattern}
                  realPath={a2uiActive}
                />

                {/* How Preview works: render-first reveal (Pass 2). Collapsed to
                    a bar by default; expands the teaching card on demand so the
                    render leads, not the explainer. */}
                <div>
                  <button
                    type="button"
                    onClick={() => setHowPreviewOpen((o) => !o)}
                    aria-expanded={howPreviewOpen}
                    className="flex w-full items-center justify-between rounded-[var(--dt-radius)] border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 text-left transition-colors hover:border-[var(--line-strong)]"
                  >
                    <span className="text-sm text-[var(--ink)]">
                      How Preview works{" "}
                      {!howPreviewOpen && (
                        <span className="text-[var(--faint)]">reveal when ready</span>
                      )}
                    </span>
                    <span
                      className="shrink-0 text-[10px] text-[var(--faint)]"
                      aria-hidden
                    >
                      {howPreviewOpen ? "▾" : "▸"}
                    </span>
                  </button>
                  {howPreviewOpen && (
                    <div className="mt-2">
                      <TeachingCard
                        name="Preview"
                        mechanism={
                          <>
                            Your setup (freedom level + request) runs the agent over
                            your Data, Rules, and Catalog. The agent emits a selection
                            or a spec; the app renders it into the Output above, and
                            the Operations module shows the exact component tree and
                            data bindings it emitted.
                          </>
                        }
                        purpose={
                          <>
                            Freedom leads because it is the real choice you are making:
                            how much you let the agent decide. Everything below the
                            Output is the receipt — what the agent actually produced —
                            so the render stays legible, not magic.
                          </>
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
          )}

          {/* Design Notes — placeholder surface (the decision log lands later). */}
          {tab === "notes" && (
            <div className="mx-auto max-w-[820px]">
              <h2 className="font-serif text-2xl">Design Notes</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                A running narrative of the design decisions behind each render.{" "}
                <span className="text-[var(--faint)]">After June 27.</span>
              </p>
            </div>
          )}
        </div>

        {/* Handoff preserved (was the nav's closing beat): name what the
            designer owns vs what still needs engineering, so the tool never
            pretends "no code anywhere." */}
        <footer className="shrink-0 border-t border-dashed border-[var(--line)] px-10 py-2 text-[10px] leading-relaxed text-[var(--muted)]">
          You author the{" "}
          <b className="font-semibold text-[var(--ink)]">
            vocabulary, constraints, and visual system
          </b>
          . A genuinely <b className="font-semibold text-[var(--ink)]">new</b>{" "}
          primitive still needs engineering. Your work with the developers
          continues.
        </footer>
      </div>

      {/* RIGHT DOCK — four authoring tiles (Data/Rules/Catalog/Theme). No Run
          control: running is the canvas request input's submit arrow. Status is
          a static placeholder this slice; real save-states land next slice. */}
      <RightDock
        tabs={AUTHORING_TABS}
        status={layerStatus}
        active={isAuthoring ? (tab as AuthoringTab) : null}
        onOpen={(t) => setTab((cur) => (cur === t ? "preview" : t))}
      />

      {/* Parked Chat — reachable from the top bar, anchored bottom-left so it
          never collides with the right dock. */}
      {chatOpen && (
        <div className="fixed bottom-4 left-4 z-40 flex h-[420px] w-[340px] flex-col overflow-hidden rounded-[12px] border border-[var(--line)] bg-[var(--surface)] shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--line)] px-3 py-2">
            <span className="text-[12px] text-[var(--muted)]">
              Chat{" "}
              <span className="font-mono text-[8.5px] text-[var(--faint)]">
                drive the canvas
              </span>
            </span>
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              aria-label="Close chat"
              className="text-[14px] leading-none text-[var(--faint)] hover:text-[var(--ink)]"
            >
              ×
            </button>
          </div>
          <div className="min-h-0 flex-1">
            <ChatPanel
              turns={chatTurns}
              onSend={chatSend}
              disabled={runState.kind === "running"}
              headerless
            />
          </div>
        </div>
      )}
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
      // Troubleshooting: "auto" mounts the inspector on localhost only (off in
      // Codespaces / prod URLs); debug logs the AG-UI event + lifecycle pipeline.
      // verbose dumps payloads — dial it to false for the public event.
      showDevConsole="auto"
      debug={{ events: true, lifecycle: true, verbose: true }}
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
