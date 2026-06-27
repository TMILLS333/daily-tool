# GenUI Studio

A hands-on playground where you shape what an AI builds. You don't write code, and you don't just type instructions and hope. You set the pieces it's allowed to use and the rules it has to follow, then watch it build.

## Why this exists

The idea it's built to show: you control the AI by giving it good pieces and clear limits, not by typing longer instructions. You choose the building blocks, you describe what each one is for, you set what's allowed, and the AI builds from that. The result is yours on purpose, not by luck.

It's a small, friendly version of how this works in real products. The components here stand in for a real design system.

## What you control

Three simple controls. No code. Change one, run the same request again, and watch the result change.

- **Data** is the task you're working on, as text. Paste in the words you want the AI to work from. Text in, UI out.
- **Rules** are optional notes in plain language. A gentle nudge for when the pieces and their descriptions aren't quite enough on their own.
- **Catalog** is the heart of it. You pick which pieces the AI can use and write a short description of what each one is for. That description is what steers the AI. Writing it well is the real design work.

## Three ways to build

The same request runs three ways, one at a time, so you can feel how much the AI gets to decide in each.

- **Controlled.** The AI only picks from the finished pieces you built. It can't make up anything new.
  *Under the hood: each piece is a React component you already wrote; the AI calls it like a tool and just chooses which one fits.*
- **Declarative.** You hand the AI a set of pieces and it arranges them. How you describe each piece is the lever you hold.
  *Under the hood: the AI sends back a layout as data (an A2UI component tree), and the app renders it using your pieces.*
- **Open-Ended.** The one mode where the AI runs free. Everywhere else, you're in charge.
  *Under the hood: the AI writes the HTML itself in its reply, and the app drops that markup straight into a sandboxed frame; none of your components touch it, so the model's own markup is the design.*

## What it's built on

Open, standard parts. You touch the design layers; the plumbing underneath is sealed and you never have to.

| Part | What it does |
| --- | --- |
| **[Next.js](https://nextjs.org) + React** | The app itself, and the controls you work in. |
| **[CopilotKit](https://copilotkit.ai)** (MIT) over the **[AG-UI](https://docs.ag-ui.com)** protocol | Connects your controls to the AI and streams what it builds back to the screen, live. |
| **[A2UI](https://a2ui.org)** | The Declarative mode. Lets the AI hand back a layout that the app renders with your real pieces. |
| Your AI key | Model-agnostic. Bring a Google, Anthropic, or OpenAI key. |

---

## Get a free AI key

Google's is free and needs no credit card:

1. Open **[aistudio.google.com/apikey](https://aistudio.google.com/apikey)** and choose **Create API key**.
2. Copy it.

The free tier handles a workshop fine. If a **rate-limit** message ever pops up, wait a few seconds and run again (current limits: [Google's rate-limit docs](https://ai.google.dev/gemini-api/docs/rate-limits)).

## Run it in your browser

Nothing to install, just a free GitHub account.

1. **Code → Codespaces → Create codespace on main**, and wait for it to open.
2. In the terminal: `cp .env.example .env`. Open `.env`, paste your key after `GOOGLE_API_KEY=`, and save.
3. Run `npm run start`. When it says **Ready**, open the app and press **Run**.

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/TMILLS333/daily-tool)

Full walkthrough: [CODESPACES.md](./CODESPACES.md).

## Keep using it after the workshop (take-home)

There is nothing to deploy. What you leave with is your own copy you can reopen any time:

- **Your fork** of this repo on GitHub, yours to keep.
- **Your Codespace**, reopened from the repo's **Code → Codespaces** menu. It boots back to the same working app.
- **Your AI key** (Google's free one, or whichever provider you used).

To run it again later, reopen your Codespace (or clone the repo and run it locally), add your key, and press **Run**. The full walkthrough is in [CODESPACES.md](./CODESPACES.md).

## If something's wrong

- **No reply / key error.** `.env` is missing or the key isn't in it. (Edited `.env` while it was running? Stop with Ctrl+C and `npm run start` again. It reads `.env` only at startup.)
- **Rate limit.** The free tier is roughly 10 requests a minute. Pause a few seconds and retry.
- **Didn't start.** Run `npm run start`.

## License

MIT. Built on [CopilotKit](https://copilotkit.ai) (MIT) and the open [AG-UI](https://docs.ag-ui.com) and [A2UI](https://a2ui.org) specs.
