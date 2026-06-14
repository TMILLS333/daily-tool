/**
 * Engine proof — verifies a Gemini tool call round-trips through BuiltInAgent.
 *
 * Run: node scripts/engine-proof.mjs
 *
 * Checks, in order:
 *   1. Key present in .env
 *   2. Plain generation works (key is alive)
 *   3. A tool call round-trips: model calls the tool, gets the result,
 *      and produces a final answer that uses it (sequential, no
 *      additionalProperties — the Gemini-safe shape used app-wide).
 *
 * This is the Pass 2 acceptance-criterion-1 gate, kept in the repo as a
 * reusable preflight: if this passes, the app's engine works for your key.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Minimal .env loader (no dependency): only the keys we need.
const root = dirname(dirname(fileURLToPath(import.meta.url)));
try {
  for (const line of readFileSync(join(root, ".env"), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  console.error("FAIL [1/3] No .env file found. Copy .env.example to .env and add your key.");
  process.exit(1);
}

if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && process.env.GOOGLE_API_KEY) {
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GOOGLE_API_KEY;
}
if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  console.error("FAIL [1/3] No GOOGLE_API_KEY in .env.");
  process.exit(1);
}
console.log("ok   [1/3] key present in .env");

const { BuiltInAgent, defineTool } = await import("@copilotkit/runtime/v2");
const { z } = await import("zod");

let MODEL = process.env.MODEL || "google/gemini-2.5-flash";

// Cloudflare Workers AI models ("@cf/...") go through the account's
// OpenAI-compatible endpoint. Needs CF_ACCOUNT_ID + CF_API_TOKEN in .env.
if (MODEL.startsWith("@cf/")) {
  if (!process.env.CF_ACCOUNT_ID || !process.env.CF_API_TOKEN) {
    console.error("FAIL @cf/ model requires CF_ACCOUNT_ID and CF_API_TOKEN in .env");
    process.exit(1);
  }
  const { createOpenAICompatible } = await import("@ai-sdk/openai-compatible");
  // Workers AI quirk (observed 2026-06-12): the chunk serializer emits
  // delta.content as whatever JSON type the fragment parses as (numbers,
  // arrays). The OpenAI spec requires string/null; the AI SDK validator
  // kills the stream otherwise. Rewrite each SSE event line.
  const fixLine = (line) => {
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
  const cfCompatFetch = async (url, init) => {
    const res = await fetch(url, init);
    if (!res.headers.get("content-type")?.includes("event-stream") || !res.body) return res;
    let buf = "";
    const fixed = res.body
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(
        new TransformStream({
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
  const workersAI = createOpenAICompatible({
    name: "workers-ai",
    baseURL: `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/v1`,
    apiKey: process.env.CF_API_TOKEN,
    fetch: cfCompatFetch,
  });
  MODEL = workersAI.chatModel(process.env.MODEL);
}

/** Run an agent once and collect its AG-UI events. */
function runOnce(agent, text) {
  return new Promise((resolve, reject) => {
    const events = [];
    agent
      .run({
        threadId: "engine-proof",
        runId: `proof-${Date.now()}`,
        messages: [{ id: "m1", role: "user", content: text }],
        tools: [],
        context: [],
        state: {},
        forwardedProps: {},
      })
      .subscribe({
        next: (e) => {
          if (e.type === "RUN_ERROR") reject(new Error(e.message || "agent run errored"));
          else events.push(e);
        },
        error: reject,
        complete: () => resolve(events),
      });
  });
}

// BuiltInAgent streams text as TEXT_MESSAGE_CHUNK (some paths use _CONTENT).
const textOf = (events) =>
  events
    .filter((e) => e.type === "TEXT_MESSAGE_CONTENT" || e.type === "TEXT_MESSAGE_CHUNK")
    .map((e) => e.delta ?? "")
    .join("");

// ---- 2. Plain generation -------------------------------------------------
try {
  const plain = new BuiltInAgent({ model: MODEL, prompt: "Reply with exactly: ENGINE OK" });
  const events = await runOnce(plain, "Status check.");
  const text = textOf(events);
  if (!text) throw new Error("no text returned");
  console.log(`ok   [2/3] plain generation works (${JSON.stringify(text.slice(0, 40))})`);
} catch (err) {
  console.error("FAIL [2/3] plain generation:", err.message || err);
  console.error("     Likely a dead/invalid key, or rate limit. Check .env.");
  process.exit(1);
}

// ---- 3. Tool-call round trip ----------------------------------------------
// Gemini-safe schema: flat object, explicit fields, no additionalProperties.
let toolCalled = false;
const secretNumber = defineTool({
  name: "get_secret_number",
  description: "Returns the secret number for a given label. Call this exactly once.",
  parameters: z.object({ label: z.string().describe("Any short label") }),
  execute: async ({ label }) => {
    toolCalled = true;
    return { label, secret: 7421 };
  },
});

try {
  const agent = new BuiltInAgent({
    model: MODEL,
    prompt:
      "You have a tool get_secret_number. Call it once with any label, then state the secret number it returned in plain text.",
    tools: [secretNumber],
    maxSteps: 4, // allow tool call + final answer (sequential)
  });
  const events = await runOnce(agent, "What is the secret number?");
  const sawToolEvents = events.some((e) => e.type === "TOOL_CALL_START");
  const finalText = textOf(events);
  if (!toolCalled) throw new Error("tool execute() never ran");
  if (!sawToolEvents) throw new Error("no TOOL_CALL events in stream");
  if (!finalText.includes("7421"))
    throw new Error(`final answer didn't use tool result: ${JSON.stringify(finalText.slice(0, 80))}`);
  console.log("ok   [3/3] tool call round-trips: called, result consumed, answer:", JSON.stringify(finalText.trim().slice(0, 60)));
  console.log("\nENGINE PROOF PASSED — tool-calling works on this key/model.");
} catch (err) {
  console.error("FAIL [3/3] tool round trip:", err.message || err);
  process.exit(1);
}
