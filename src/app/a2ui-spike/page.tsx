"use client";

import { useCallback, useRef, useState } from "react";
import { CopilotKit, useAgent, useCopilotKit } from "@copilotkit/react-core/v2";
import "@copilotkit/react-core/v2/styles.css";
import {
  A2UIProvider,
  A2UIRenderer,
  useA2UIActions,
  useA2UIError,
  useA2UIState,
} from "@copilotkit/a2ui-renderer";
import { catalog } from "@/lib/a2ui-spike-catalog";

/**
 * A2UI spike — LOW-LEVEL render-owner PROOF (dev-only, isolated).
 *
 * Pass 1 of the real-A2UI-to-production promotion. This page proves the
 * production-shaped render path: a copilotkit.runAgent()-driven run (the same
 * driver the shipped canvas uses, NOT <CopilotChat>) paints a REAL A2UI surface
 * into a plain page container via the low-level A2UIProvider + A2UIRenderer
 * primitives. The sibling /a2ui-spike-chat page is the high-level auto-mount
 * variant; it paints the same surface but only inside a CopilotChat transcript,
 * which is the wrong render-owner for the production canvas.
 *
 * Where the operations live (confirmed empirically against 1.60.0): the A2UI
 * surface rides the AG-UI "a2ui-surface" activity. The live ACTIVITY_SNAPSHOT
 * events only carry the pre-paint lifecycle states (building / retrying); the
 * painted operations (createSurface + updateComponents) land on the
 * activity-role MESSAGE in agent.messages, at content.a2ui_operations. That is
 * the same source react-core's own createA2UIMessageRenderer reads. So we feed
 * from the message list — reactively via onMessagesChanged, with a guaranteed
 * post-run sweep — not from the activity event payloads.
 *
 * The feed + re-run guard mirror react-core's own SurfaceMessageProcessor: skip
 * redundant re-feeds (ops hash), and once a surface exists for an id strip
 * createSurface before re-feeding, so repeat runs neither throw nor accumulate.
 * Each run clears the prior surface first.
 *
 * Verify on a PRODUCTION build (next build + next start). Agent runs throw a
 * client-side fetch "Illegal invocation" under next dev in this stack.
 */

// @ag-ui/client stores the global fetch and calls it as this.fetch(...), which
// browsers reject with "Illegal invocation". Bind it before any agent runs.
if (typeof window !== "undefined") {
  window.fetch = window.fetch.bind(window);
}

const THEME = { colors: { primary: "#0f6b75" } };

// Matches A2UI_OPERATIONS_KEY in @copilotkit/react-core's A2UI middleware: the
// emitted operations ride the "a2ui-surface" activity at content.a2ui_operations.
const A2UI_OPERATIONS_KEY = "a2ui_operations";

const FIXED_PROMPT =
  "Summarize this usability test: a heading, then one card per finding with a severity badge. Findings: 1) Checkout button hard to find (high). 2) Form labels unclear (medium). 3) Confirmation page confusing (low).";

// Resolve the surfaceId an operation targets. Mirrors react-core's
// getOperationSurfaceId so we render the id the agent actually created, rather
// than assuming DEFAULT_SURFACE_ID.
function operationSurfaceId(op: unknown): string | null {
  if (!op || typeof op !== "object") return null;
  const o = op as Record<string, any>;
  if (typeof o.surfaceId === "string") return o.surfaceId;
  return (
    o?.createSurface?.surfaceId ??
    o?.updateComponents?.surfaceId ??
    o?.updateDataModel?.surfaceId ??
    o?.deleteSurface?.surfaceId ??
    null
  );
}

type Phase = "idle" | "running" | "complete" | "error";

function Runner() {
  const { copilotkit } = useCopilotKit();
  const { agent } = useAgent();
  const { processMessages, getSurface, clearSurfaces } = useA2UIActions();
  const a2uiError = useA2UIError();
  // Subscribe to A2UI store changes so the surface-present readout stays live.
  useA2UIState();

  const [phase, setPhase] = useState<Phase>("idle");
  const [surfaceId, setSurfaceId] = useState<string | null>(null);
  const [opCount, setOpCount] = useState(0);
  const [runError, setRunError] = useState<string | null>(null);
  const lastHashRef = useRef("");

  // Feed the emitted A2UI operations from the activity-role message into the
  // store. Finds the latest "a2ui-surface" activity message carrying
  // operations, skips redundant re-feeds (hash), strips createSurface once the
  // surface exists (re-run guard), and resolves the surfaceId from the ops.
  const feedFromMessages = useCallback(
    (messages: ReadonlyArray<Record<string, any>>) => {
      const activity = [...messages]
        .reverse()
        .find(
          (m) =>
            m?.role === "activity" &&
            Array.isArray(m?.content?.[A2UI_OPERATIONS_KEY]) &&
            m.content[A2UI_OPERATIONS_KEY].length > 0
        );
      if (!activity) return;

      const ops = activity.content[A2UI_OPERATIONS_KEY] as Record<string, unknown>[];
      const hash = JSON.stringify(ops);
      if (hash === lastHashRef.current) return;
      lastHashRef.current = hash;

      const id = ops.map(operationSurfaceId).find(Boolean) ?? null;
      processMessages(
        id && getSurface(id)
          ? ops.filter((op) => !op?.createSurface)
          : ops
      );
      if (id) setSurfaceId(id);
      setOpCount(ops.length);
    },
    [processMessages, getSurface]
  );

  const run = useCallback(async () => {
    if (!agent) {
      setRunError("No agent available.");
      setPhase("error");
      return;
    }

    // Reset for a clean, repeatable run: clear the prior surface, reset run
    // state, and reset the de-dup hash so re-runs don't accumulate.
    clearSurfaces();
    setPhase("running");
    setSurfaceId(null);
    setOpCount(0);
    setRunError(null);
    lastHashRef.current = "";

    agent.setMessages([]);
    agent.addMessage({
      id: crypto.randomUUID(),
      role: "user",
      content: FIXED_PROMPT,
    });

    // Paint as soon as the painted activity message lands during the run...
    const sub = agent.subscribe({
      onMessagesChanged: ({ messages }) =>
        feedFromMessages(messages as ReadonlyArray<Record<string, any>>),
    });

    try {
      await copilotkit.runAgent({ agent });
      // ...and a guaranteed final sweep once the run resolves.
      feedFromMessages((agent.messages ?? []) as ReadonlyArray<Record<string, any>>);
      setPhase("complete");
    } catch (err) {
      setRunError(err instanceof Error ? err.message : String(err));
      setPhase("error");
    } finally {
      sub.unsubscribe();
    }
  }, [agent, copilotkit, clearSurfaces, feedFromMessages]);

  const surfacePresent = !!surfaceId && !!getSurface(surfaceId);
  const failedNoSurface = phase === "complete" && !surfacePresent && !a2uiError;

  const statusLabel = (() => {
    if (phase === "idle") return "Idle — run to paint a surface.";
    if (phase === "running") return "Running…";
    if (runError) return "Run error.";
    if (a2uiError) return "A2UI render error.";
    if (surfacePresent) return "Surface painted.";
    return "Run completed, but no A2UI surface was produced.";
  })();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={phase === "running"}
          className="self-start rounded px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: "#0f6b75" }}
        >
          Run fixed prompt (runAgent + low-level A2UI)
        </button>
        <span className="text-sm text-neutral-700">{statusLabel}</span>
      </div>

      <div className="text-[11px] text-neutral-500">
        Driver: copilotkit.runAgent (no CopilotChat mounted) · resolved surfaceId:{" "}
        <span className="font-mono">{surfaceId ?? "—"}</span> · operations captured:{" "}
        {opCount}
      </div>

      <div className="rounded border border-neutral-200 p-3">
        <div className="mb-2 text-[11px] uppercase tracking-wide text-neutral-400">
          A2UIRenderer surface (painted into the plain page container)
        </div>

        {runError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Run error: {runError}
          </div>
        ) : a2uiError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            A2UI render error: {a2uiError}
          </div>
        ) : failedNoSurface ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Run completed but no A2UI surface was produced — the activity carried
            no operations.
          </div>
        ) : surfaceId ? (
          <A2UIRenderer
            surfaceId={surfaceId}
            fallback={
              <p className="text-sm text-neutral-400">Resolving surface…</p>
            }
          />
        ) : (
          <p className="text-sm text-neutral-400">
            {phase === "running" ? "Waiting for the surface…" : "No surface yet."}
          </p>
        )}
      </div>
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
              A2UI spike — low-level render-owner proof (dev only)
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Drives the run via copilotkit.runAgent (the path the shipped canvas
              uses) and paints the emitted A2UI through the low-level A2UIRenderer,
              outside CopilotChat. Operations are read from the
              &ldquo;a2ui-surface&rdquo; activity message. Run the same prompt
              several times to confirm it repeats. Test on a production build
              (next build + next start).
            </p>
            <p className="mt-1 select-all rounded bg-neutral-50 p-2 text-xs text-neutral-600">
              {FIXED_PROMPT}
            </p>
          </header>
          <Runner />
        </main>
      </A2UIProvider>
    </CopilotKit>
  );
}
