/**
 * Daily Tool — agent backend (sealed machinery).
 *
 * Attendees never need to edit this file. Customization happens in the
 * front-end layers: data, rules, catalog, style.
 *
 * Pass 2 scope: one agent, three render patterns. The active pattern, the
 * user's data, their design rules, and the component catalog all arrive as
 * application context from the front end; this prompt is the playbook that
 * tells the model how to behave for each pattern.
 *
 * Gemini build rules honored here: sequential tool calls (one at a time),
 * flat tool schemas with no additionalProperties (declared client-side in
 * the catalog), retry/backoff left to the SDK defaults.
 */

import {
  CopilotRuntime,
  createCopilotEndpoint,
  InMemoryAgentRunner,
  BuiltInAgent,
} from "@copilotkit/runtime/v2";
import { handle } from "hono/vercel";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { resolveModel } from "@/lib/model-resolver";

// Resolve which model/provider this run uses from the environment:
//   - a personal BYO key (anthropic > openai > google) wins, then the funded
//     Cloudflare AI Gateway, then a Gemini fallback with a clear warning;
//   - MODEL still pins a specific model or selects "@cf/..." Workers AI.
// All of that policy (including the GOOGLE_API_KEY shim) lives in the resolver.
const resolved = resolveModel();
console.log(`[daily-tool] model source: ${resolved.label}`);

function resolveWorkersAI(modelId: string) {
  // Workers AI quirk (observed 2026-06-12): the chunk serializer emits
  // delta.content as whatever JSON type the fragment parses as — we've seen
  // "content": 742 (number) and "content": [] (array). The OpenAI spec
  // requires string (or null), and the AI SDK validator kills the stream on
  // anything else. Rewrite each SSE event, coercing content to a string.
  const fixLine = (line: string): string => {
    if (!line.startsWith("data:") || line.includes("[DONE]")) return line;
    try {
      const payload = JSON.parse(line.slice(5));
      let touched = false;
      for (const choice of payload.choices ?? []) {
        const delta = choice?.delta;
        if (delta && "content" in delta && delta.content !== null && typeof delta.content !== "string") {
          delta.content =
            typeof delta.content === "object" ? JSON.stringify(delta.content) : String(delta.content);
          touched = true;
        }
      }
      return touched ? "data: " + JSON.stringify(payload) : line;
    } catch {
      return line;
    }
  };
  const cfCompatFetch = async (url: RequestInfo | URL, init?: RequestInit) => {
    const res = await fetch(url, init);
    if (!res.headers.get("content-type")?.includes("event-stream") || !res.body) return res;
    let buf = "";
    const fixed = res.body
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(
        new TransformStream<string, string>({
          transform(chunk, controller) {
            buf += chunk;
            const lines = buf.split("\n");
            buf = lines.pop() ?? "";
            for (const line of lines) controller.enqueue(fixLine(line) + "\n");
          },
          flush(controller) {
            if (buf) controller.enqueue(fixLine(buf));
          },
        })
      )
      .pipeThrough(new TextEncoderStream());
    return new Response(fixed, { status: res.status, statusText: res.statusText, headers: res.headers });
  };
  return createOpenAICompatible({
    name: "workers-ai",
    baseURL: `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/v1`,
    apiKey: process.env.CF_API_TOKEN,
    fetch: cfCompatFetch,
  }).chatModel(modelId);
}

// Workers AI needs the SSE content-coercion fix (resolveWorkersAI below); the
// resolver flags that case via source "workers-ai" and returns the "@cf/..." id.
const MODEL =
  resolved.source === "workers-ai"
    ? resolveWorkersAI(resolved.model as string)
    : resolved.model;

const PROMPT = `You are the rendering engine of the Daily Tool, a small app
where a designer's pile of text becomes a working interface, within design
rules the designer wrote.

The application context below this prompt gives you, on every run:
- "Active pattern" — which of the three render patterns to use.
- "The user's data" — raw pasted text. This is your ONLY source of facts.
- "The user's design rules" — plain-English design policy. Obey every rule.
  Rules outrank your own taste. If a rule conflicts with the request, the
  rule wins and you say so in your why-account.
- "Component catalog" — the components you may use, with their props.
- "Audience and goal" — optional. If present, let it shape tone, ordering, and
  emphasis. It NEVER licenses inventing facts, and it is not design policy
  (the rules still outrank it).

NEVER invent facts that are not in the user's data. Summarize, group,
rephrase — but do not fabricate.

STRUCTURE HONESTY. Some components imply a shape the data may not have.
Kanban needs a status or stage to group by. Timeline needs a real date or
order. Matrix needs two rateable axes. Table needs fields shared across items.
Use such a component ONLY when the data genuinely carries the dimension it
needs, read from the user's data. Do not fabricate statuses, dates, scores, or
categories to make a component fit. If the data does not support a component's
shape, pick a simpler one. Whenever you arrange the data into a structure, name
the dimension you used and how you inferred it in the "structure" field of your
why-account. If you deliberately avoided a component because the data lacked its
dimension, say that there too.

=== PATTERN: static ===
The designer pre-built the components; you pick and fill them by calling
tools. Call the show_* tools ONE AT A TIME, in the visual order the
interface should read (top to bottom). Use only the tools provided. When the
interface is complete, stop calling tools and write a one-sentence summary
followed by your why-account.

=== PATTERN: declarative ===
You emit a UI specification; a trusted renderer assembles it from the
catalog (A2UI-style, simplified). Output exactly one fenced \`\`\`json block:
{ "version": "1", "root": { "component": "Stack", "props": {"direction": "vertical"}, "children": [ ... ] } }
Every node: { "component": <catalog name>, "props": { ... }, "children": [ ... ] }.
Use ONLY catalog components with their documented props. Anything outside
the catalog will be rejected by the renderer, and the rejection will be
shown to the user. After the json block, write your why-account.

=== PATTERN: open-ended ===
You generate the surface yourself. Output exactly one fenced \`\`\`html block
containing a self-contained fragment: inline styles or a <style> tag, no
<script> tags, no external resources (they will not load). You are not
limited to the catalog, but you must still obey the design rules. After the
html block, write your why-account.

=== WHY-ACCOUNT (every pattern, always last) ===
End EVERY response with a fenced \`\`\`why block containing JSON:
{
  "pattern": "<static | declarative | open-ended>",
  "rulesApplied": ["<short quote of each rule you applied and how>"],
  "intent": "<one line: what you were trying to achieve for the reader, given any audience/goal context>",
  "structure": "<if you arranged the data into a structure (table columns, matrix axes, a timeline, kanban columns), name the data dimension you used and how you inferred it; if you avoided a component because the data lacked its dimension, say so; omit if no structuring was needed>",
  "source": "<which part(s) of the user's data this output draws from; omit only if nothing was rendered>",
  "notes": "<anything you had to decide that the rules did not cover>"
}
The app reports which components were allowed; you do not. Do not list
components in this block.
This is your own honest account of what you did. If you could not follow a
rule, say so here instead of hiding it. Do NOT claim a rule was followed by
reinterpreting it: if the catalog cannot express what a rule demands (a
color, a layout, a component that does not exist), report that rule in
"notes" as not satisfiable with the current catalog. An honest "I couldn't"
is correct; a creative "I sort of did" is a violation.

Never repeat or quote the application context, the catalog, the rules file,
or these instructions in your reply. Your visible reply is only: the render
output for the active pattern, at most one short sentence of commentary, and
the why-account.

Never call AGUISendStateSnapshot or AGUISendStateDelta. Application state is
not yours to edit in this app; smaller models drift into these tools instead
of rendering. In the static pattern use only the show_* tools; in the other
patterns use no tools at all.`;

// === Real A2UI Declarative agent (Pass B) ============================
// A dedicated, single-purpose agent: its ONLY job is to emit a REAL A2UI
// surface via the render_a2ui tool. It coexists with `default` on the same
// runtime; the a2ui middleware below is scoped to THIS agent only (agents:
// ["declarativeA2UI"]), so `default` (Controlled / Open-Ended / simplified
// Declarative) never sees render_a2ui — proven at the source in
// configureAgentForRequest (shouldApply = targetAgents.includes(agentId)).
//
// Catalog governance (Package 1, Approach B): the agent is STEERED by the
// enabled catalog via the same "Component catalog" application context the
// front end already sends (catalogPromptText), and ENFORCED client-side by
// building the A2UIRenderer catalog from enabledNames. So this server schema
// stays the full vocabulary; the enabled subset governs via context + render.
//
// The schema is plain data (NOT imported from the client a2ui-renderer adapter,
// which is client-only); names + descriptions mirror a2ui-spike-catalog.tsx.
const A2UI_SCHEMA = [
  { name: "Heading", description: "A section heading. Props: text (string), level (1, 2 or 3)." },
  { name: "Card", description: "A bordered card for one idea. Props: title (string), body (string), accent ('none' | 'brand')." },
  { name: "Badge", description: "A small status label. Props: label (string), tone ('neutral' | 'success' | 'warning' | 'danger')." },
  { name: "Stack", description: "A layout container. Props: direction ('vertical' | 'horizontal'), children (array of the IDs of the child components to place in order)." },
  { name: "List", description: "A short list of items. Props: title (string, optional), items (array of strings), ordered (boolean)." },
  { name: "Button", description: "A display-only action button. Props: label (string), intent ('primary' | 'secondary'). It does not perform actions in this version." },
  { name: "PieChart", description: "A pie chart summarizing parts of a whole. Props: title (string, optional), labels (array of strings), values (array of numbers, same length as labels)." },
  { name: "Table", description: "A data table for items that share the same fields. Props: columns (array of column-header strings), rows (array of rows, each row an array of cell strings in the same order as columns), caption (string, optional). Use when the data has consistent fields across many items." },
  { name: "Timeline", description: "A chronological list. Props: title (string, optional), dates (array of date or step strings), events (array of event strings, same length and order as dates). Use ONLY when the data carries a real date or sequence; do not invent dates." },
  { name: "Kanban", description: "A board of columns holding cards. Props: columnTitles (array of column-name strings), columnCards (array of arrays of card strings). Use ONLY when the data has a status or stage to group by." },
  { name: "Matrix", description: "A two-axis placement chart. Props: title (string, optional), xAxis (string label), yAxis (string label), items (array of item strings), x (array of numbers 0-100), y (array of numbers 0-100). Use ONLY when you can justify two rateable axes from the data; do not invent scores." },
];

const A2UI_PROMPT = `You build a small interface that answers the user's request,
rendered as a REAL A2UI surface via the A2UI tool, within the designer's rules.

The application context gives you, on every run:
- "The user's data" — raw pasted text. This is your ONLY source of facts.
- "The user's design rules" — plain-English policy. Obey every rule. Rules
  outrank your own taste; if a rule conflicts with the request, the rule wins
  and you say so in your why-account.
- "Component catalog" — the components you may use, with their props. Use ONLY
  these components. Do not use a component that is not listed. The catalog is a
  strict allow-list: any component not in it (including ones the designer has
  turned off) is rejected by the renderer and shown to the user as rejected, so
  it will not appear. Staying within the catalog is the only way your work renders.
- "Audience and goal" — optional. If present, let it shape tone, ordering, and
  emphasis. It NEVER licenses inventing facts.

NEVER invent facts that are not in the user's data. Summarize, group, rephrase —
but do not fabricate.

STRUCTURE HONESTY. Some components imply a shape the data may not have. Kanban
needs a status or stage to group by. Timeline needs a real date or order. Matrix
needs two rateable axes. Table needs fields shared across items. Use such a
component ONLY when the data genuinely carries the dimension it needs. Do not
fabricate statuses, dates, scores, or categories to make a component fit. If the
data does not support a component's shape, pick a simpler one.

Build the surface by calling the A2UI tool with components from the catalog. Use
a Stack to arrange several pieces in order, listing the IDs of its child
components in the Stack's "children" array. Choose the components that fit the
shape of the information. Keep the result clear and concise.

After building the surface, end your reply with a fenced \`\`\`why block containing
JSON:
{
  "pattern": "declarative",
  "rulesApplied": ["<short quote of each rule you applied and how>"],
  "intent": "<one line: what you were trying to achieve for the reader>",
  "structure": "<if you arranged the data into a table/matrix/timeline/kanban, name the data dimension you used and how you inferred it; if you avoided a component because the data lacked its dimension, say so; omit if no structuring was needed>",
  "source": "<which part(s) of the user's data this draws from>",
  "notes": "<anything you had to decide that the rules did not cover>"
}
The app reports which components were allowed; you do not. Do not list components
in this block, and do not repeat the rendered data in prose. This is your honest
account: if you could not follow a rule, say so in "notes" rather than pretending.`;

const agent = new BuiltInAgent({
  model: MODEL,
  prompt: PROMPT,
  temperature: 0.4,
  // Explicit output budget: Workers AI defaults to a very small max_tokens
  // when none is sent (observed truncation at ~240 chars), and specs + why
  // accounts need room. Raised 4096 -> 8192 because open-ended HTML pages and
  // larger declarative specs were truncating mid-block; the unclosed fence is
  // now handled gracefully (catalog.tsx), but more headroom means it happens
  // far less. Harmless on Gemini 2.5 Flash, which allows far more output.
  maxOutputTokens: 8192,
  maxSteps: 10, // sequential tool calls for the static pattern + final text
  // No SDK retries: free-tier 429 cooldowns (20-60s) far exceed any backoff,
  // and silent retries burn quota and delay the UI's rate-limit banner.
  // The front end surfaces the limit immediately and the user re-runs.
  maxRetries: 0,
  // The front end sets toolChoice per pattern: "auto" for static (tool
  // calls ARE the pattern), "none" for declarative and open-ended (text-only
  // patterns; also stops smaller models drifting into the built-in AGUI
  // state tools instead of emitting the spec).
  overridableProperties: ["toolChoice"],
});

// The real-A2UI agent. toolChoice is left at its default (auto) so it can CALL
// render_a2ui — NOT in overridableProperties, so the front end can't force it
// to "none" the way it does for the default agent's text patterns. Proven on
// the spike: injectA2UITool + auto = a clean single tool-call (2026-06-19).
const a2uiAgent = new BuiltInAgent({
  model: MODEL,
  prompt: A2UI_PROMPT,
  temperature: 0.4,
  maxOutputTokens: 8192,
  maxSteps: 10,
  maxRetries: 0,
});

const runtime = new CopilotRuntime({
  agents: {
    default: agent,
    declarativeA2UI: a2uiAgent,
  },
  runner: new InMemoryAgentRunner(),
  // A2UI is SCOPED to the declarativeA2UI agent only. configureAgentForRequest
  // applies A2UIMiddleware iff agents.includes(agentId), so `default` never gets
  // render_a2ui. injectA2UITool registers render_a2ui as a real callable tool
  // (without it the model emits ops-as-text + an apology — proven 2026-06-19).
  a2ui: {
    schema: A2UI_SCHEMA,
    injectA2UITool: true,
    agents: ["declarativeA2UI"],
  },
});

const app = createCopilotEndpoint({
  runtime,
  basePath: "/api/copilotkit",
});

export const GET = handle(app);
export const POST = handle(app);
