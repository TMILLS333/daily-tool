"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAgent, useCopilotKit } from "@copilotkit/react-core/v2";
import {
  A2UIProvider,
  A2UIRenderer,
  useA2UIActions,
  useA2UIError,
  useA2UIState,
} from "@copilotkit/a2ui-renderer";
import { buildCatalog } from "@/lib/a2ui-spike-catalog";

/**
 * Real-A2UI Declarative canvas (Pass B). Renders a REAL A2UI surface into the
 * production middle canvas via the low-level A2UIProvider / A2UIRenderer — the
 * render-owner pattern proven in /a2ui-spike (Pass 1), transplanted here and
 * pointed at the production runtime's `declarativeA2UI` agent.
 *
 * Mounted only when the (default-OFF) real-A2UI sub-mode flag is on, so the
 * shipped Declarative path (DeclarativePattern.tsx) is untouched when the flag
 * is off. Driven by `runNonce`: the parent bumps it to fire a run; this island
 * owns the A2UI agent run + the surface feed, and reports back up:
 *  - onReply: the last assistant string (carries the ```why block) so the
 *    parent's WhyPanel keeps working;
 *  - onStatus: running / complete / error for the parent's run banner;
 *  - onSurface: whether a surface actually painted, so the parent can
 *    auto-fall-back to the simplified renderer when a real run yields no ops.
 *
 * Operations live on the "a2ui-surface" activity MESSAGE (content.a2ui_operations),
 * NOT the live activity events — see the spike header for the full rationale.
 * Verify on a PRODUCTION build (next build + next start); next dev throws a
 * client fetch "Illegal invocation" on agent runs in this stack.
 */

// Petrol teal, matching --dt-brand's default. Full token-driven theming of the
// A2UI surface is a deferred follow-up (the reveal/emergence thread).
const THEME = { colors: { primary: "#0f6b75" } };

// Mirrors A2UI_OPERATIONS_KEY in @copilotkit/react-core's A2UI middleware.
const A2UI_OPERATIONS_KEY = "a2ui_operations";

type RunStatus = "running" | "complete" | "error";

/** Resolve the surfaceId an operation targets (mirrors getOperationSurfaceId). */
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

interface RunnerProps {
  request: string;
  runNonce: number;
  onReply: (reply: string) => void;
  onStatus: (status: RunStatus, message?: string) => void;
  onSurface: (present: boolean) => void;
}

function Runner({ request, runNonce, onReply, onStatus, onSurface }: RunnerProps) {
  const { copilotkit } = useCopilotKit();
  // Target the dedicated A2UI agent, NOT the default three-pattern agent.
  const { agent } = useAgent({ agentId: "declarativeA2UI" });
  const { processMessages, getSurface, clearSurfaces } = useA2UIActions();
  const a2uiError = useA2UIError();
  // Subscribe to store changes so surface-present stays live.
  useA2UIState();

  const [surfaceId, setSurfaceId] = useState<string | null>(null);
  const lastHashRef = useRef("");
  // Guards the run effect against React strict-mode double-invoke and re-renders.
  const ranNonceRef = useRef(0);

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
        id && getSurface(id) ? ops.filter((op) => !(op as any)?.createSurface) : ops
      );
      if (id) setSurfaceId(id);
    },
    [processMessages, getSurface]
  );

  useEffect(() => {
    if (!runNonce || runNonce === ranNonceRef.current) return;
    ranNonceRef.current = runNonce;
    if (!request.trim()) return;

    let cancelled = false;
    (async () => {
      if (!agent) {
        onStatus("error", "The A2UI agent is not available yet — try again.");
        return;
      }
      clearSurfaces();
      setSurfaceId(null);
      lastHashRef.current = "";
      onStatus("running");

      agent.setMessages([]);
      agent.addMessage({ id: crypto.randomUUID(), role: "user", content: request });

      const sub = agent.subscribe({
        onMessagesChanged: ({ messages }: { messages: unknown }) =>
          feedFromMessages(messages as ReadonlyArray<Record<string, any>>),
      });

      try {
        // No toolChoice override: the A2UI agent must be free to CALL render_a2ui.
        await copilotkit.runAgent({ agent });
        feedFromMessages((agent.messages ?? []) as ReadonlyArray<Record<string, any>>);
        const lastAssistant = [...(agent.messages ?? [])]
          .reverse()
          .find(
            (m: any) =>
              m?.role === "assistant" &&
              typeof m?.content === "string" &&
              m.content.trim()
          );
        if (!cancelled) {
          onReply(((lastAssistant?.content as string) ?? "").trim());
          onStatus("complete");
        }
      } catch (err) {
        if (!cancelled) {
          onStatus("error", err instanceof Error ? err.message : String(err));
        }
      } finally {
        sub.unsubscribe();
      }
    })();

    return () => {
      cancelled = true;
    };
    // Fire only on a new run nonce; the rest are stable refs/callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runNonce]);

  const surfacePresent = !!surfaceId && !!getSurface(surfaceId);
  useEffect(() => {
    onSurface(surfacePresent);
  }, [surfacePresent, onSurface]);

  if (a2uiError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        A2UI render error: {a2uiError}
      </div>
    );
  }

  if (surfaceId && surfacePresent) {
    return (
      <div className="flex flex-col" style={{ gap: "var(--dt-gap)" }}>
        <span className="self-start rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500">
          Real A2UI (live surface)
        </span>
        <A2UIRenderer
          surfaceId={surfaceId}
          fallback={<p className="text-sm text-neutral-400">Resolving surface…</p>}
        />
      </div>
    );
  }

  // No surface to show — the parent decides whether to show a fallback.
  return null;
}

export interface DeclarativeA2UILiveProps {
  request: string;
  /** Bump to fire a run. */
  runNonce: number;
  /** App truth: which components the designer has enabled (governs the catalog). */
  enabledNames: ReadonlySet<string>;
  onReply: (reply: string) => void;
  onStatus: (status: RunStatus, message?: string) => void;
  onSurface: (present: boolean) => void;
}

export function DeclarativeA2UILive({
  request,
  runNonce,
  enabledNames,
  onReply,
  onStatus,
  onSurface,
}: DeclarativeA2UILiveProps) {
  // Catalog governance: the renderer only knows the enabled components, so a
  // surface that references a disabled one simply doesn't paint that node.
  const catalog = useMemo(() => buildCatalog(enabledNames), [enabledNames]);
  return (
    <A2UIProvider catalog={catalog} theme={THEME}>
      <Runner
        request={request}
        runNonce={runNonce}
        onReply={onReply}
        onStatus={onStatus}
        onSurface={onSurface}
      />
    </A2UIProvider>
  );
}
