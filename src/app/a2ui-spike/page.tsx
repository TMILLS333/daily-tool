"use client";

import { useCallback, useState } from "react";
import { CopilotKit, useAgent, useCopilotKit } from "@copilotkit/react-core/v2";
import "@copilotkit/react-core/v2/styles.css";
import {
  A2UIProvider,
  A2UIRenderer,
  DEFAULT_SURFACE_ID,
  useA2UIActions,
} from "@copilotkit/a2ui-renderer";
import { catalog } from "@/lib/a2ui-spike-catalog";

/**
 * A2UI spike — LOW-LEVEL primitives variant (dev-only, isolated).
 *
 * The CopilotChat path threw a client-side fetch "Illegal invocation" on every
 * run (dev and prod). The shipped app's own runs work in a production build
 * because it drives them with copilotkit.runAgent(), not CopilotChat. So this
 * variant: drive the run with runAgent (the proven path), then render the
 * emitted A2UI through the low-level A2UIProvider + A2UIRenderer, feeding
 * operations via useA2UIActions().processMessages(). The dump shows the run
 * output so we can locate where the A2UI operations live.
 *
 * Reminder: agent runs are broken under `next dev` in this stack — test this on
 * a production build (`next build` + `next start`).
 */

// Same upstream-bug workaround the shipped page.tsx carries: @ag-ui/client
// stores the global `fetch` and calls it as `this.fetch(...)`, which browsers
// reject with "Illegal invocation". Bind it to window before any agent is
// constructed. Without this, every run on this page throws.
if (typeof window !== "undefined") {
  window.fetch = window.fetch.bind(window);
}

const THEME = { colors: { primary: "#0f6b75" } };

const FIXED_PROMPT =
  "Summarize this usability test: a heading, then one card per finding with a severity badge. Findings: 1) Checkout button hard to find (high). 2) Form labels unclear (medium). 3) Confirmation page confusing (low).";

function Runner() {
  const { copilotkit } = useCopilotKit();
  const { agent } = useAgent();
  const actions = useA2UIActions();
  const [status, setStatus] = useState("idle");
  const [dump, setDump] = useState("");

  const run = useCallback(async () => {
    if (!agent) {
      setStatus("no agent");
      return;
    }
    setStatus("running…");
    setDump("");
    try {
      actions.clearSurfaces();
      agent.setMessages([]);
      agent.addMessage({
        id: crypto.randomUUID(),
        role: "user",
        content: FIXED_PROMPT,
      });

      await copilotkit.runAgent({ agent });

      // Locate the A2UI operations in the run output.
      const msgs = (agent.messages ?? []) as Array<Record<string, unknown>>;
      const summary = msgs.map((m) => ({ role: m.role, keys: Object.keys(m) }));

      // Best-effort feed: process whatever came back into the A2UI store.
      let feedError = "";
      try {
        actions.processMessages(msgs);
      } catch (e) {
        feedError = e instanceof Error ? e.message : String(e);
      }

      const surface = actions.getSurface(DEFAULT_SURFACE_ID);
      setStatus(
        `run complete — A2UI surface ${surface ? "PRESENT" : "absent"}` +
          (feedError ? ` (processMessages threw: ${feedError})` : "")
      );
      setDump(
        JSON.stringify(
          { messageCount: msgs.length, summary, hasSurface: !!surface, messages: msgs },
          null,
          2
        ).slice(0, 8000)
      );
    } catch (err) {
      setStatus("RUN ERROR: " + (err instanceof Error ? err.message : String(err)));
    }
  }, [agent, copilotkit, actions]);

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={run}
        className="self-start rounded px-3 py-1.5 text-sm font-medium text-white"
        style={{ background: "#0f6b75" }}
      >
        Run fixed prompt (runAgent + A2UI)
      </button>
      <div className="text-sm text-neutral-700">Status: {status}</div>
      <div className="rounded border border-neutral-200 p-3">
        <div className="mb-2 text-[11px] uppercase tracking-wide text-neutral-400">
          A2UIRenderer surface
        </div>
        <A2UIRenderer
          surfaceId={DEFAULT_SURFACE_ID}
          fallback={<p className="text-sm text-neutral-400">No surface yet.</p>}
        />
      </div>
      <pre className="max-h-[38vh] overflow-auto rounded bg-neutral-50 p-2 text-[11px] leading-snug">
        {dump}
      </pre>
    </div>
  );
}

export default function A2UISpikePage() {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit-a2ui-spike" useSingleEndpoint={false}>
      <A2UIProvider catalog={catalog} theme={THEME}>
        <main className="mx-auto flex max-w-3xl flex-col gap-3 p-4">
          <header>
            <h1 className="font-serif text-xl font-medium">
              A2UI spike — low-level primitives (dev only)
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Drives the run via copilotkit.runAgent (the path that works in a
              production build) and renders the emitted A2UI via the low-level
              A2UIRenderer, bypassing CopilotChat. The dump shows the run output
              so we can locate the A2UI operations.
            </p>
          </header>
          <Runner />
        </main>
      </A2UIProvider>
    </CopilotKit>
  );
}
