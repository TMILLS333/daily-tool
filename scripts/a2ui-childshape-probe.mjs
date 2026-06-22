/**
 * THROWAWAY (Pass E-1) — probes what child-shape the declarativeA2UI agent emits.
 *
 * Drives the REAL prod endpoint (next start on :3000) via the AG-UI HttpAgent,
 * exactly as the browser does, and captures the render_a2ui tool-call args +
 * any a2ui_operations activity message. Reports, per run, the Stack child shape:
 *   - flat array of id strings   (works; Pass D path)
 *   - array of { id } objects     (works; alias)
 *   - { componentId, path } template (the SUSPECTED second silent-empty path)
 * and whether a root Stack would resolve to zero children (silent empty).
 *
 * Usage: node scripts/a2ui-childshape-probe.mjs [N] [label]
 */

import { HttpAgent } from "@ag-ui/client";

const N = Number(process.argv[2] || "1");
const LABEL = process.argv[3] || "run";
const URL = "http://localhost:3000/api/copilotkit/agent/declarativeA2UI/run";

// Catalog context, mirroring catalogPromptText() over the full DT catalog.
const CATALOG = `- Heading: A section heading. Props: text (string), level (1, 2 or 3).
- Card: A bordered card for one idea. Props: title (string), body (string), accent ('none' | 'brand').
- Badge: A small status label. Props: label (string), tone ('neutral' | 'success' | 'warning' | 'danger').
- Stack: A layout container. Props: direction ('vertical' | 'horizontal'), children (array of the IDs of the child components to place in order).
- List: A short list of items. Props: title (string, optional), items (array of strings), ordered (boolean).
- Button: A display-only action button. Props: label (string), intent ('primary' | 'secondary').
- PieChart: A pie chart. Props: title (optional), labels (array of strings), values (array of numbers).
- Table: A data table. Props: columns (array), rows (array of arrays), caption (optional).
- Timeline: A chronological list. Props: title (optional), dates (array), events (array).
- Kanban: A board of columns. Props: columnTitles (array), columnCards (array of arrays).
- Matrix: A two-axis placement chart. Props: title (optional), xAxis, yAxis, items, x, y.`;

// Data shaped to PROVOKE repeating per-item cards (the template-children case).
const DATA = `Team standup notes:
- Ana Reyes: shipped the onboarding flow, blocked on design review.
- Boris Tan: fixing the export bug, needs QA time.
- Carla Mehta: writing the API docs, on track.
- Dmitri Vance: investigating the latency spike, needs more logs.
- Esra Yilmaz: prepping the demo, waiting on copy.`;

const RULES = `Keep it scannable. One card per person.`;

const REQUEST =
  "Show each team member as its own card in a single vertical stack, one card per person.";

function analyzeOps(ops) {
  // ops: array of A2UI operations. Find component definitions and inspect Stack children.
  const findings = { stacks: [], shapes: new Set(), componentCount: 0 };
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(walk);
    // component-ish?
    const type = node.componentType || node.component || node.type;
    if (type) findings.componentCount++;
    if (type === "Stack" || (node.props && (node.props.childIds || node.props.children))) {
      const props = node.props || node;
      const ch = props.children ?? props.childIds;
      let shape = "none";
      if (Array.isArray(ch)) {
        if (ch.every((x) => typeof x === "string")) shape = "array<string>";
        else if (ch.every((x) => x && typeof x === "object" && "id" in x)) shape = "array<{id}>";
        else if (ch.some((x) => x && typeof x === "object" && "componentId" in x)) shape = "array<{componentId,path}>";
        else shape = "array<mixed>";
      } else if (ch && typeof ch === "object" && "componentId" in ch) {
        shape = "{componentId,path}";
      } else if (ch == null) {
        shape = "absent";
      }
      const count = Array.isArray(ch) ? ch.length : ch ? 1 : 0;
      findings.stacks.push({ shape, count, key: props.children != null ? "children" : props.childIds != null ? "childIds" : "—" });
      findings.shapes.add(shape);
    }
    for (const v of Object.values(node)) walk(v);
  };
  walk(ops);
  return findings;
}

async function runOnce(i) {
  const agent = new HttpAgent({ url: URL, agentId: "declarativeA2UI" });
  agent.messages = [{ id: `u${i}-${Date.now()}`, role: "user", content: REQUEST }];

  const toolArgs = {}; // id -> accumulated string
  const toolNames = {}; // id -> name
  let opsFromActivity = null;
  let finalText = "";
  let runError = null;

  await new Promise((resolve) => {
    agent
      .runAgent({
        context: [
          { description: "Active pattern", value: "declarative" },
          { description: "The user's data (the only source of facts)", value: DATA },
          { description: "The user's design rules (binding policy)", value: RULES },
          { description: "Component catalog (the allowed vocabulary)", value: CATALOG },
        ],
      })
      .then(() => resolve())
      .catch((e) => {
        runError = e?.message || String(e);
        resolve();
      });
    // Also subscribe via the returned observable? runAgent resolves a promise;
    // event capture below uses agent state after completion.
  });

  // After the run, inspect the agent's accumulated messages for tool calls + activity ops.
  for (const m of agent.messages || []) {
    if (m.role === "activity" && m.content && Array.isArray(m.content.a2ui_operations)) {
      opsFromActivity = m.content.a2ui_operations;
    }
    if (m.role === "assistant") {
      if (typeof m.content === "string") finalText += m.content;
      for (const tc of m.toolCalls || []) {
        const fn = tc.function || {};
        toolNames[tc.id] = fn.name;
        toolArgs[tc.id] = fn.arguments || "";
      }
    }
  }

  // Parse render_a2ui tool args
  let opsFromTool = null;
  for (const [id, name] of Object.entries(toolNames)) {
    if (/a2ui|render/i.test(name || "")) {
      try { opsFromTool = JSON.parse(toolArgs[id]); } catch { opsFromTool = { _raw: toolArgs[id]?.slice(0, 200) }; }
    }
  }

  const ops = opsFromActivity || opsFromTool;
  const analysis = ops ? analyzeOps(ops) : null;
  return { i, runError, hasOps: !!ops, toolNames: Object.values(toolNames), analysis, finalTextLen: finalText.length, ops };
}

console.log(`\n=== Pass E-1 child-shape probe: ${LABEL}, N=${N} ===`);
const tally = { ok: 0, empty: 0, noOps: 0, error: 0, shapes: {} };
for (let i = 1; i <= N; i++) {
  const r = await runOnce(i);
  if (r.runError) { tally.error++; console.log(`run ${i}: ERROR ${r.runError}`); continue; }
  if (!r.hasOps) { tally.noOps++; console.log(`run ${i}: NO OPS (tools seen: ${r.toolNames.join(",") || "none"})`); continue; }
  const a = r.analysis;
  const emptyStack = a.stacks.some((s) => s.count === 0);
  const tmpl = a.stacks.some((s) => s.shape.includes("componentId"));
  for (const s of a.stacks) tally.shapes[s.shape] = (tally.shapes[s.shape] || 0) + 1;
  if (emptyStack || tmpl) tally.empty++; else tally.ok++;
  console.log(`run ${i}: components=${a.componentCount} stacks=${JSON.stringify(a.stacks)} ${tmpl ? "<<< TEMPLATE FORM" : ""}${emptyStack ? " <<< EMPTY STACK" : ""}`);
  if (i === 1 && process.env.DUMP) console.log("  RAW OPS:\n" + JSON.stringify(r.ops, null, 2).split("\n").slice(0, 60).join("\n"));
}
console.log(`\nTALLY ${LABEL}:`, JSON.stringify(tally));
