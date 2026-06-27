# GenUI Studio

**Generative UI, for the rest of us.**

A designer's playground for hands-on generative UI — shape what an AI agent
builds through the **catalog**, **rules**, and **theme** you design, across three
patterns: **Controlled**, **Declarative**, and **Open-Ended**.

## Get a free AI key

Google's is free and needs no credit card:

1. Open **[aistudio.google.com/apikey](https://aistudio.google.com/apikey)** → **Create API key**.
2. Copy it.

The free tier handles a workshop fine. If a **rate-limit** message ever pops up,
wait a few seconds and run again (current limits:
[Google's rate-limit docs](https://ai.google.dev/gemini-api/docs/rate-limits)).

*Given a shared workshop token instead? Use that and skip the key — see
[CODESPACES.md](./CODESPACES.md).*

## Run it in your browser

Nothing to install — just a free GitHub account.

1. **Code → Codespaces → Create codespace on main**, and wait for it to open.
2. In the terminal: `cp .env.example .env`. Open `.env`, paste your key after
   `GOOGLE_API_KEY=`, and save.
3. Run `npm run start`. When it says **Ready**, open the app and press **Run**.

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/TMILLS333/daily-tool)

Want a shareable link? Set port **3000** to **Public** in the **Ports** tab.
Full walkthrough: [CODESPACES.md](./CODESPACES.md).

## Keep using it after the workshop (take-home)

There is nothing to deploy. What you leave with is your own copy you can reopen
any time:

- **Your fork** of this repo on GitHub, yours to keep.
- **Your Codespace**, reopened from the repo's **Code → Codespaces** menu. It
  boots back to the same working app.
- **Your AI key** (Google's free one, or whichever provider you used).

To run it again later, reopen your Codespace (or clone the repo and run it
locally), add your key, and press **Run**. The full walkthrough is in
[CODESPACES.md](./CODESPACES.md).

## If something's wrong

- **No reply / key error** — `.env` is missing or the key isn't in it. (Edited
  `.env` while it was running? Stop with Ctrl+C and `npm run start` again — it
  reads `.env` only at startup.)
- **Rate limit** — the free tier is roughly 10 requests a minute; pause a few
  seconds and retry.
- **Didn't start** — run `npm run start`.

## How it's built

The backend (`src/app/api`) is sealed — you never touch it. Everything you
customize is in the front-end layers. Built on [CopilotKit](https://copilotkit.ai) (MIT).
