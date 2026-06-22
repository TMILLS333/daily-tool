"use client";

import { parseFencedBlockMeta } from "@/lib/catalog";

/**
 * Open-Ended pattern — the agent generates the surface itself.
 * Rendered in a sandboxed iframe: no scripts, no external resources, no
 * access to the app. The freedom/no-system trade-off, made visible.
 */
export function OpenEndedPattern({ agentText }: { agentText: string | null }) {
  if (!agentText) {
    return (
      <p className="text-sm text-neutral-400">
        Nothing rendered yet. Here the agent invents the surface — no catalog,
        only your written rules between it and the user.
      </p>
    );
  }

  const parsed = parseFencedBlockMeta(agentText, "html");
  if (!parsed || !parsed.body) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
        <div className="font-semibold text-amber-800">No HTML found</div>
        <div className="mt-0.5 text-amber-700">
          The agent&apos;s response did not contain an HTML block. Run again.
        </div>
      </div>
    );
  }

  const { body: html, truncated } = parsed;

  return (
    <div className="flex flex-col gap-2">
      <span className="self-start rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500">
        agent-generated markup, sandboxed (no scripts)
      </span>
      <iframe
        sandbox=""
        srcDoc={html}
        title="Open-ended render"
        className="h-[420px] w-full rounded-lg border border-neutral-200 bg-white"
      />
      {truncated ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
          <div className="font-semibold text-amber-800">Cut off</div>
          <div className="mt-0.5 text-amber-700">
            This surface was cut off (the model hit its output limit). The partial
            render is shown above. Run again for the full version.
          </div>
        </div>
      ) : null}
    </div>
  );
}
