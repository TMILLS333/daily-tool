/**
 * A2UI spike — agent backend (dev-only, isolated).
 *
 * A separate CopilotKit runtime from the shipped /api/copilotkit route, mounted
 * at /api/copilotkit-a2ui-spike. The one new thing versus the main route: the
 * runtime declares the `a2ui` middleware, so /info advertises A2UI and the
 * client renderer auto-mounts. `a2ui.schema` tells the agent which components it
 * may emit. The agent emits REAL A2UI operations; nothing in the shipped app is
 * touched.
 *
 * Note: the schema is declared inline as plain data, NOT imported from the
 * client catalog adapter. @copilotkit/a2ui-renderer calls React.createContext at
 * load and cannot be imported into a server route — these names + descriptions
 * mirror the renderer catalog in a2ui-spike-catalog.tsx.
 */

import {
  BuiltInAgent,
  CopilotRuntime,
  createCopilotEndpoint,
  InMemoryAgentRunner,
} from "@copilotkit/runtime/v2";
import { handle } from "hono/vercel";

// Same key shim as the main route: our .env uses the short GOOGLE_API_KEY, while
// the underlying Google SDK looks for GOOGLE_GENERATIVE_AI_API_KEY.
if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && process.env.GOOGLE_API_KEY) {
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GOOGLE_API_KEY;
}

// Gemini on the paid key (the big-screen model). The spike is Gemini-only, so a
// stray MODEL=@cf/... override meant for the main app is ignored here.
const MODEL_ID =
  process.env.MODEL && process.env.MODEL.startsWith("google/")
    ? process.env.MODEL
    : "google/gemini-2.5-flash";

// The catalog advertised to the agent. Plain data (no a2ui-renderer import).
// The prose lists each component's props so the model emits them correctly; the
// names + prop names mirror the renderer catalog in a2ui-spike-catalog.tsx.
const A2UI_SCHEMA = [
  {
    name: "Heading",
    description: "A section heading. Props: text (string), level (1, 2 or 3).",
  },
  {
    name: "Card",
    description:
      "A bordered card for one idea. Props: title (string), body (string), accent ('none' | 'brand').",
  },
  {
    name: "Badge",
    description:
      "A small status label. Props: label (string), tone ('neutral' | 'success' | 'warning' | 'danger').",
  },
  {
    name: "Stack",
    description:
      "A layout container. Props: direction ('vertical' | 'horizontal'), childIds (array of child component IDs to place in order).",
  },
  {
    name: "List",
    description:
      "A short list of items. Props: title (string, optional), items (array of strings), ordered (boolean).",
  },
  {
    name: "Button",
    description:
      "A display-only action button. Props: label (string), intent ('primary' | 'secondary'). It does not perform actions in this version.",
  },
  {
    name: "PieChart",
    description:
      "A pie chart summarizing parts of a whole. Props: title (string, optional), labels (array of strings), values (array of numbers, same length as labels).",
  },
  {
    name: "Table",
    description:
      "A data table for items that share the same fields. Props: columns (array of column-header strings), rows (array of rows, each row an array of cell strings in the same order as columns), caption (string, optional). Use when the data has consistent fields across many items.",
  },
  {
    name: "Timeline",
    description:
      "A chronological list. Props: title (string, optional), dates (array of date or step strings), events (array of event strings, same length and order as dates). Use ONLY when the data carries a real date or sequence; do not invent dates.",
  },
  {
    name: "Kanban",
    description:
      "A board of columns holding cards. Props: columnTitles (array of column-name strings), columnCards (array of arrays of card strings; columnCards[i] holds the cards under columnTitles[i]). Use ONLY when the data has a status or stage to group by.",
  },
  {
    name: "Matrix",
    description:
      "A two-axis placement chart (e.g. effort vs impact). Props: title (string, optional), xAxis (string label), yAxis (string label), items (array of item strings), x (array of numbers 0-100, same length as items), y (array of numbers 0-100, same length as items). Use ONLY when you can justify two rateable axes from the data; do not invent scores.",
  },
];

const PROMPT = `You build a small UI that answers the user's request, using ONLY
the components in the provided A2UI catalog. The user's text is your only source
of facts; never invent data, dates, or scores. Choose the components that fit the
shape of the information: use a Stack to arrange several pieces, and reach for a
structured component (Table, Timeline, Kanban, Matrix, PieChart) only when the
data genuinely carries that structure. Keep the result clear and concise.`;

const agent = new BuiltInAgent({
  model: MODEL_ID,
  prompt: PROMPT,
  // Low temperature for repeatable spike runs.
  temperature: 0.2,
  maxOutputTokens: 4096,
  maxSteps: 10,
  maxRetries: 0,
});

const runtime = new CopilotRuntime({
  agents: { default: agent },
  runner: new InMemoryAgentRunner(),
  // Enabling a2ui advertises A2UI on /info (so the client renderer auto-mounts)
  // and injects the catalog schema so the agent emits these components.
  // injectA2UITool registers render_a2ui as a real callable tool. Without it the
  // model is told to call a tool it does not have, so it emits the operations as
  // TEXT (an apology or a raw-JSON code block) and re-emits the surface
  // (double-render). Registering the tool gives a clean single tool-call path.
  // Proven live in prod 2026-06-19 (apology + JSON dump + duplicate all gone).
  a2ui: { schema: A2UI_SCHEMA, injectA2UITool: true },
});

// Multi-route mode, mirroring the shipped /api/copilotkit endpoint, which is the
// configuration proven to run agents in a production build. (The single-route
// path routes runs through the core's unbound this.fetch and throws "Illegal
// invocation" in both dev and prod; the multi-route ag-ui path works in prod.)
const app = createCopilotEndpoint({
  runtime,
  basePath: "/api/copilotkit-a2ui-spike",
});

export const GET = handle(app);
export const POST = handle(app);
