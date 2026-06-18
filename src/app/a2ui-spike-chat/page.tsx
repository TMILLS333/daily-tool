"use client";

import { CopilotKit, CopilotChat } from "@copilotkit/react-core/v2";
import "@copilotkit/react-core/v2/styles.css";
import { catalog } from "@/lib/a2ui-spike-catalog";

/**
 * A2UI spike — HIGH-LEVEL auto-mount variant (dev-only, isolated).
 *
 * Now that the fetch "Illegal invocation" bug is fixed, this uses the path the
 * a2ui-renderer skill intends: the provider's `a2ui` prop auto-mounts
 * createA2UIMessageRenderer, and <CopilotChat> renders the agent's emitted A2UI
 * surface inline. No manual A2UIProvider / A2UIRenderer / processMessages, and no
 * surface-id matching — the framework populates and renders the surface itself.
 * The sibling /a2ui-spike page is the low-level attempt, kept for comparison.
 *
 * `a2ui.catalog` gives the renderer the React components for Heading/Card/Badge/
 * Stack; `includeSchema` (default true) sends those component schemas to the
 * agent as context.
 */

// Same upstream-bug workaround the shipped page.tsx carries: bind global fetch
// before any agent is constructed, or @ag-ui/client throws "Illegal invocation".
if (typeof window !== "undefined") {
  window.fetch = window.fetch.bind(window);
}

const THEME = { colors: { primary: "#0f6b75" } };

const SAMPLE =
  "Summarize this usability test: a heading, then one card per finding with a severity badge. Findings: 1) Checkout button hard to find (high). 2) Form labels unclear (medium). 3) Confirmation page confusing (low).";

export default function A2UISpikeChatPage() {
  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit-a2ui-spike"
      useSingleEndpoint={false}
      a2ui={{ theme: THEME, catalog }}
    >
      <main className="mx-auto flex h-dvh max-w-3xl flex-col gap-3 p-4">
        <header>
          <h1 className="font-serif text-xl font-medium">
            A2UI spike — high-level auto-mount (dev only)
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            The provider&apos;s a2ui prop auto-mounts the A2UI renderer; the
            agent&apos;s emitted surface paints inside the chat. Paste this to test:
          </p>
          <p className="mt-1 select-all rounded bg-neutral-50 p-2 text-xs text-neutral-600">
            {SAMPLE}
          </p>
        </header>
        <div className="min-h-0 flex-1 overflow-hidden rounded border border-neutral-200">
          <CopilotChat agentId="default" className="h-full" />
        </div>
      </main>
    </CopilotKit>
  );
}
