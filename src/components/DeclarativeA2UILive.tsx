"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  useAgent,
  useCopilotKit,
  useRenderActivityMessage,
  CopilotChatConfigurationProvider,
  UseAgentUpdate,
} from "@copilotkit/react-core/v2";

/**
 * Real-A2UI Declarative canvas — NATIVE render path.
 *
 * The provider (page.tsx) supplies `a2ui={{ theme, catalog }}`, which auto-mounts
 * createA2UIMessageRenderer. This island drives the dedicated `declarativeA2UI`
 * agent and paints its emitted `a2ui-surface` activity message into the canvas via
 * useRenderActivityMessage — no low-level A2UIProvider / A2UIRenderer / processMessages.
 * Catalog governance is the provider's catalog (built from enabledNames in page.tsx).
 *
 * Operations live on the "a2ui-surface" activity MESSAGE (content.a2ui_operations),
 * NOT the live activity events. Verify on a PROD build (next build + next start);
 * next dev throws "Illegal invocation" on agent runs in this stack.
 */

const A2UI_OPERATIONS_KEY = "a2ui_operations";

type RunStatus = "running" | "complete" | "error";

interface RunnerProps {
  request: string;
  runNonce: number;
  stopNonce: number;
  onReply: (reply: string) => void;
  onStatus: (status: RunStatus, message?: string) => void;
  onSurface: (present: boolean) => void;
  onOps: (ops: ReadonlyArray<Record<string, unknown>>) => void;
}

function Runner({ request, runNonce, stopNonce, onReply, onStatus, onSurface, onOps }: RunnerProps) {
  const { copilotkit } = useCopilotKit();
  const { agent } = useAgent({
    agentId: "declarativeA2UI",
    updates: [UseAgentUpdate.OnMessagesChanged],
  });
  const { renderActivityMessage } = useRenderActivityMessage();
  const ranNonceRef = useRef(0);
  const lastHashRef = useRef("");

  // Latest a2ui-surface activity message — the painted ops live here.
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

  // Lift ops up for the reveal panels (Pass C) + report surface presence.
  useEffect(() => {
    if (!a2uiMessage) {
      onSurface(false);
      return;
    }
    const ops = a2uiMessage.content[A2UI_OPERATIONS_KEY] as Record<string, unknown>[];
    const hash = JSON.stringify(ops);
    if (hash !== lastHashRef.current) {
      lastHashRef.current = hash;
      onOps(ops);
    }
    onSurface(true);
  }, [a2uiMessage, onOps, onSurface]);

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
      lastHashRef.current = "";
      onStatus("running");
      agent.setMessages([]);
      agent.addMessage({ id: crypto.randomUUID(), role: "user", content: request });
      try {
        // No toolChoice override: the A2UI agent must be free to CALL render_a2ui.
        await copilotkit.runAgent({ agent });
        const lastAssistant = [...(agent.messages ?? [])]
          .reverse()
          .find(
            (m: any) =>
              m?.role === "assistant" && typeof m?.content === "string" && m.content.trim()
          );
        if (!cancelled) {
          onReply(((lastAssistant?.content as string) ?? "").trim());
          onStatus("complete");
        }
      } catch (err) {
        if (!cancelled) {
          onStatus("error", err instanceof Error ? err.message : String(err));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // Fire only on a new run nonce; the rest are stable refs/callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runNonce]);

  // Abort the island's run when the parent bumps stopNonce (Stop button). The
  // island owns its own agent, so the page-level abort cannot reach it.
  const stopRef = useRef(0);
  useEffect(() => {
    if (!stopNonce || stopNonce === stopRef.current) return;
    stopRef.current = stopNonce;
    try {
      agent?.abortRun();
    } catch {
      /* no active run to abort */
    }
  }, [stopNonce, agent]);

  if (!a2uiMessage) return null;

  return (
    <div className="flex flex-col" style={{ gap: "var(--dt-gap)" }}>
      <span className="self-start rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500">
        Real A2UI (live surface)
      </span>
      {renderActivityMessage(a2uiMessage as any)}
    </div>
  );
}

export interface DeclarativeA2UILiveProps {
  request: string;
  /** Bump to fire a run. */
  runNonce: number;
  /** Bump to abort the in-flight run (Stop button). */
  stopNonce: number;
  onReply: (reply: string) => void;
  onStatus: (status: RunStatus, message?: string) => void;
  onSurface: (present: boolean) => void;
  /** The emitted A2UI operations, for the reveal panels (Pass C). */
  onOps: (ops: ReadonlyArray<Record<string, unknown>>) => void;
}

export function DeclarativeA2UILive(props: DeclarativeA2UILiveProps) {
  // Scope the auto-mounted A2UI renderer to the declarativeA2UI agent.
  return (
    <CopilotChatConfigurationProvider agentId="declarativeA2UI">
      <Runner {...props} />
    </CopilotChatConfigurationProvider>
  );
}
