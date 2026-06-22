"use client";

import { useCallback, useMemo, useState } from "react";
import {
  CopilotKitProvider,
  CopilotChatConfigurationProvider,
  useAgent,
  useCopilotKit,
  useRenderActivityMessage,
  UseAgentUpdate,
} from "@copilotkit/react-core/v2";
import "@copilotkit/react-core/v2/styles.css";
import { buildCatalog } from "@/lib/a2ui-spike-catalog";

/**
 * NATIVE-CANVAS A2UI spike (dev-only, isolated).
 *
 * Proves the native render-owner path: the provider's `a2ui` prop auto-mounts
 * createA2UIMessageRenderer, and useRenderActivityMessage() paints the
 * declarativeA2UI agent's emitted `a2ui-surface` activity message into THIS
 * custom canvas div — no low-level A2UIProvider / A2UIRenderer / processMessages.
 * Targets the SHIPPED main route + its real `declarativeA2UI` agent.
 *
 * Verify on a PROD build (npm run build + npm run start); next dev throws a
 * client fetch "Illegal invocation" on agent runs in this stack.
 */

// Same upstream-bug workaround the shipped page carries: bind global fetch
// before any agent is constructed, or @ag-ui/client throws "Illegal invocation".
if (typeof window !== "undefined") {
  window.fetch = window.fetch.bind(window);
}

const THEME = { colors: { primary: "#0f6b75" } };
const A2UI_OPERATIONS_KEY = "a2ui_operations";

const SAMPLE =
  "Summarize this usability test: a heading, then one card per finding with a severity badge. Findings: 1) Checkout button hard to find (high). 2) Form labels unclear (medium). 3) Confirmation page confusing (low).";

type RunStatus = "idle" | "running" | "complete" | "error";

function Canvas() {
  const { copilotkit } = useCopilotKit();
  const { agent } = useAgent({
    agentId: "declarativeA2UI",
    updates: [UseAgentUpdate.OnMessagesChanged],
  });
  const { renderActivityMessage } = useRenderActivityMessage();
  const [status, setStatus] = useState<RunStatus>("idle");
  const [error, setError] = useState<string>("");

  const run = useCallback(async () => {
    if (!agent) {
      setStatus("error");
      setError("declarativeA2UI agent not available");
      return;
    }
    setStatus("running");
    setError("");
    agent.setMessages([]);
    agent.addMessage({ id: crypto.randomUUID(), role: "user", content: SAMPLE });
    try {
      await copilotkit.runAgent({ agent });
      setStatus("complete");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [agent, copilotkit]);

  // The painted ops land on the "a2ui-surface" activity MESSAGE
  // (content.a2ui_operations), not the live events.
  const a2uiMessage = useMemo(() => {
    const messages = (agent?.messages ?? []) as ReadonlyArray<Record<string, any>>;
    return [...messages]
      .reverse()
      .find(
        (m) =>
          m?.role === "activity" &&
          Array.isArray(m?.content?.[A2UI_OPERATIONS_KEY]) &&
          m.content[A2UI_OPERATIONS_KEY].length > 0
      );
  }, [agent?.messages]);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <button
          onClick={run}
          disabled={status === "running"}
          className="rounded bg-[#0f6b75] px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
          {status === "running" ? "Running…" : "Run A2UI"}
        </button>
        <span className="text-xs text-neutral-500">status: {status}</span>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="a2ui-surface rounded border border-neutral-200 p-4" style={{ minHeight: 120 }}>
        {a2uiMessage ? (
          renderActivityMessage(a2uiMessage as any)
        ) : (
          <p className="text-sm text-neutral-400">No surface yet — run to paint.</p>
        )}
      </div>
    </section>
  );
}

export default function A2UISpikeCanvasPage() {
  // Catalog governance: drop "Card" to confirm a disabled component does not paint.
  const [dropCard, setDropCard] = useState(false);
  const enabledNames = useMemo(() => {
    const names = new Set([
      "Heading", "Card", "Badge", "Stack", "List", "Button",
      "PieChart", "Table", "Timeline", "Kanban", "Matrix",
    ]);
    if (dropCard) names.delete("Card");
    return names;
  }, [dropCard]);
  const catalog = useMemo(() => buildCatalog(enabledNames), [enabledNames]);

  return (
    <CopilotKitProvider
      runtimeUrl="/api/copilotkit"
      showDevConsole={false}
      a2ui={{ theme: THEME, catalog }}
    >
      <CopilotChatConfigurationProvider agentId="declarativeA2UI">
        <main className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
          <header>
            <h1 className="font-serif text-xl font-medium">A2UI native-canvas spike (dev only)</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Renders the production declarativeA2UI agent into a custom canvas via
              useRenderActivityMessage — no low-level A2UIProvider/A2UIRenderer.
            </p>
          </header>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={dropCard} onChange={(e) => setDropCard(e.target.checked)} />
            Governance test: disable &quot;Card&quot; (it must not paint)
          </label>
          <Canvas />
        </main>
      </CopilotChatConfigurationProvider>
    </CopilotKitProvider>
  );
}
