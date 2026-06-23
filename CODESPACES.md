# Run the Daily Tool in the browser (GitHub Codespaces)

**Coffee & Claude: GenUI Challenge · IxDF Dallas · June 27, 2026**

This is the in-room path. You install nothing. A Codespace is a full computer
that runs in your browser, boots the app, and gives you a live web address you
can share. You need a free personal GitHub account (18+) and the free AI key
from `.env.example`.

## 1. Open the Codespace

On the repo's GitHub page, click the green **Code** button, choose the
**Codespaces** tab, then **Create codespace on main**.

It opens a code editor in your browser and sets itself up. The app's
dependencies install on their own. If the repo owner enabled prebuilds (see the
last section), this takes well under a minute; the first time on a repo without
prebuilds it can take a few minutes.

## 2. Add your AI key

You bring ANY ONE key: Google (free, no card, the recommended default),
Anthropic, or OpenAI. The app auto-detects which one you set.

1. In the file list on the left, open `.env.example` and read the steps at the
   top. For the free option, grab a Google AI Studio key (personal Gmail, 18+,
   no card); the file also lists where to get an Anthropic or OpenAI key.
2. Right-click `.env.example` and choose **Copy**, then **Paste**. Rename the
   copy to `.env`.
3. Open `.env`, paste your key into the matching line (`GOOGLE_API_KEY=`,
   `ANTHROPIC_API_KEY=`, or `OPENAI_API_KEY=`), and save.

Your key stays on the server side of the app inside your own Codespace. It is
never committed (the repo ignores `.env`) and never sent to the browser. If the
host configured a shared key, you can skip this step and the app runs on that;
paste your own key to use it instead, or clear it to return to the shared key.

## 3. Start the app (and restart after adding your key)

When the Codespace opens, it starts the app for you. The app reads your key only
at startup, so the copy that started before you added your key (step 2) will not
see it yet. After you save your key, restart the app:

1. In the terminal at the bottom, stop the running app (click the trash/stop
   icon on its task, or press Ctrl+C in that terminal).
2. Start it again with:

```
npm run start
```

Watch for the line that says the server is **Ready**. A small popup will offer to
open the app; open it and go to any pattern tab, then press **Run**.

A faster check that your key and the engine work, straight from the terminal:

```
node scripts/engine-proof.mjs
```

## 4. Make it live (your shareable URL)

By default the running app is private to you. To turn it into a link you can
share:

1. Open the **Ports** tab (next to the Terminal tab at the bottom).
2. Find the row for port **3000** (labeled **Daily Tool**).
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

- **No reply / error about a key** — your `.env` file is missing, the key was
  not pasted, or you added the key but did not restart the app. Re-check step 2,
  then restart (step 3).
- **"Rate limit" message** — the free tier allows about 10 requests per minute.
  Wait a few seconds and try again.
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
