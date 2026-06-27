# Run GenUI Studio in the browser (GitHub Codespaces)

**GenUI Challenge · IxDF Dallas · June 27, 2026**

This is the in-room path. You install nothing. A Codespace is a full computer
that runs in your browser, boots the app, and gives you a live web address you
can share. You need a free personal GitHub account (18+). The app runs on the shared
workshop gateway, so the only thing you add is the one token your host gives you
at the event (or your own AI key, if you'd rather).

## 1. Open the Codespace

On the repo's GitHub page, click the green **Code** button, choose the
**Codespaces** tab, then **Create codespace on main**.

It opens a code editor in your browser and sets itself up. The app's
dependencies install on their own. If the repo owner enabled prebuilds (see the
last section), this takes well under a minute; the first time on a repo without
prebuilds it can take a few minutes.

## 2. Add the workshop token

The app runs on a shared, funded Claude gateway, so you do not need your own AI
key. Your host gives you ONE token at the event. The gateway ids are already set
for you in the Codespace, so the token is all you add.

1. Create your `.env` from the template. Fastest, in the terminal at the bottom:

   ```
   cp .env.example .env
   ```

   (Or in the file list: right-click `.env.example`, **Copy**, **Paste**, and
   rename the copy to exactly `.env` — not `.env.example`. The app only ever
   reads `.env`; pasting your key into `.env.example` does nothing.)
2. Open `.env`, paste the event token right after `CF_AIG_TOKEN=` (no spaces, no
   quotes), and save.

That's it. Your token stays on the server side of the app inside your own
Codespace; it is never committed (the repo ignores `.env`) and never sent to the
browser.

**Prefer your own key?** Optional. Paste a Google (free), Anthropic, or OpenAI
key into the matching commented line in `.env` instead, and it overrides the
gateway (you pay that provider). Clear it again to return to the shared gateway.

## 3. Start the app

The Codespace sets itself up but does **not** auto-start the app, so you can add
your key first (step 2). Once your `.env` is saved, start it in the terminal:

```
npm run start
```

Watch for the line that says the server is **Ready**. A small popup will offer to
open the app; open it and go to any pattern tab, then press **Run**. (If you edit
`.env` later, stop the app with Ctrl+C and run `npm run start` again — it reads
`.env` only at startup.)

(A terminal self-check, `node scripts/engine-proof.mjs`, verifies a personal
**Google** key and the tool-calling engine. It does not test the shared gateway,
so on the token-only setup just press **Run** in the app instead.)

## 4. Make it live (your shareable URL)

By default the running app is private to you. To turn it into a link you can
share:

1. Open the **Ports** tab (next to the Terminal tab at the bottom).
2. Find the row for port **3000** (labeled **GenUI Studio**).
3. Right-click that row, choose **Port Visibility**, then **Public**.
4. Copy the **Forwarded Address** for that row. That web address is your live
   app. Paste it into a browser, or share it.

That address is your live URL for the room. It stays up while your Codespace is
running and goes to sleep when the Codespace stops, which is fine for the night.
For a copy that stays live after the workshop, use the
Deploy-to-Cloudflare take-home in the [README](./README.md).

> **If "Public" is greyed out:** your GitHub account or organization has turned
> off public port forwarding. Set the port to **Private** and you can still use
> the app yourself in the room, or jump straight to the Cloudflare take-home for
> a durable link.

## If something's wrong

- **No reply / error about a key** — your `.env` file is missing, the event
  token (or your own key) was not pasted, or you added it but did not restart the
  app. Re-check step 2, then restart (step 3).
- **"Rate limit" message** — the shared gateway allows 350 requests/minute across
  the whole room; if everyone runs at once you may briefly hit it, so wait a few
  seconds and try again. (On your own free Google key it is about 10/min.)
- **The app did not start** — run `npm run start` in the terminal (step 3).

---

## One-time setup for the repo owner (enable prebuilds)

This section is for whoever owns the GitHub repo, not for attendees. Prebuilds
are what keep the under-a-minute boot promise, and they are a repo setting, not
a file in this project.

On the repo: **Settings → Codespaces → Prebuilds → Set up prebuild**. Point it
at the default branch and the devcontainer in `.devcontainer/devcontainer.json`,
then let the first prebuild finish before the workshop. After that, new
Codespaces start from the prebuilt image with dependencies already installed.
