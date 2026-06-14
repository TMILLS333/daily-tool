# Daily Tool

**Coffee & Claude: GenUI Challenge · IxDF Dallas · June 27, 2026**

A small app where an AI agent turns your daily pile of text — interview
quotes, audit findings, campaign briefs — into a working interface, within
design rules **you** write. You design the grammar; the agent speaks it.

The core loop is live: paste anything into the **Data** tab, write plain-English
design policy in the **Rules** tab, then run the same request through three
render patterns — **Static** (the agent fills components you pre-built),
**Declarative** (the agent emits a spec; your catalog decides what renders,
A2UI-style), and **Open-Ended** (the agent invents the surface, sandboxed).
The "Why this render" panel reports which rules fired and which components
were allowed. Catalog toggles and the Style tab arrive next.

## Open it in the browser (recommended for the workshop)

In the room on June 27 you install nothing. Click **Code → Codespaces → Create
codespace**, wait for it to boot, paste your free AI key, and the app runs in
your browser with a shareable live URL. Full walkthrough:
[CODESPACES.md](./CODESPACES.md).

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/TMILLS333/daily-tool)

While the repo is private the badge opens only for the owner and invited
collaborators; it becomes a one-click entry point for everyone once the repo is
made public before the event. Prefer to run it on your own machine instead?
Keep reading.

## Run it (no engineering background needed)

1. **Get your free AI key** (about 3 minutes)
   Open the file `.env.example` and follow the steps at the top. You'll end
   up with a file named `.env` containing your key.

2. **Install** (first time only) — in the terminal:

   ```
   npm install
   ```

3. **Start the app:**

   ```
   npm run dev
   ```

4. Open http://localhost:3000, go to any pattern tab, and press **Run**.
   If an interface appears, your engine works.

   Want a faster check? `node scripts/engine-proof.mjs` verifies your key
   and the tool-calling engine from the terminal in about ten seconds.

## Keep using it after the workshop (take-home)

There is nothing to deploy. What you leave with is your own copy you can reopen
any time:

- **Your fork of this repo** on GitHub, yours to keep.
- **Your Codespace**, reopened from the repo's **Code → Codespaces** menu. It
  boots back to the same working app.
- **Your free Gemini key**, the same one you used in the room.

To run it again later, reopen your Codespace (or clone the repo and run it
locally), add your key, and press **Run**. The full walkthrough is in
[CODESPACES.md](./CODESPACES.md).

> **Advanced: self-host on Cloudflare.** A permanent, always-on URL is possible
> on Cloudflare Workers, but this app's bundle exceeds the Cloudflare **free**
> plan's 3 MiB Worker limit, so it needs **Workers Paid**. With a paid account
> and the repo cloned, set your key with `npx wrangler secret put GOOGLE_API_KEY`,
> then run `npm run deploy` (builds with OpenNext, deploys via Wrangler). This is
> an advanced path, not the workshop take-home.

## If something's wrong

- **No reply / error about a key** — your `.env` file is missing or the key
  wasn't pasted. Re-check step 1.
- **"Rate limit" message** — the free tier allows about 10 requests per
  minute. Wait a few seconds and try again.
- Anything else: copy the error and ask a floater (at the workshop) or open
  an issue.

## How this app is shaped

The backend (the `src/app/api` folder) is sealed machinery — you never need
to touch it. Everything you'll customize lives in the front-end layers.
Built on [CopilotKit](https://copilotkit.ai) (MIT).
