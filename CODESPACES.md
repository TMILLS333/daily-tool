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

This is the same free key you would use to run the app on your own machine, and
it lives in the same file.

1. In the file list on the left, open `.env.example` and read the steps at the
   top to get your free Google AI Studio key (personal Gmail, 18+, no card).
2. Right-click `.env.example` and choose **Copy**, then **Paste**. Rename the
   copy to `.env`.
3. Open `.env`, paste your key after `GOOGLE_API_KEY=`, and save.

Your key stays on the server side of the app inside your own Codespace. It is
never committed (the repo ignores `.env`) and never sent to the browser.

## 3. The app starts itself

When the Codespace opens, it runs the app for you. Watch the terminal at the
bottom for a line that says the server is **Ready**. A small popup will offer to
open the app; open it and go to any pattern tab, then press **Run**.

If the app is not running (for example after you added the key), start it from
the terminal with:

```
npm run dev
```

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

- **No reply / error about a key** — your `.env` file is missing or the key was
  not pasted. Re-check step 2.
- **"Rate limit" message** — the free tier allows about 10 requests per minute.
  Wait a few seconds and try again.
- **The app did not start** — run `npm run dev` in the terminal (step 3).

---

## One-time setup for the repo owner (enable prebuilds)

This section is for whoever owns the GitHub repo, not for attendees. Prebuilds
are what keep the under-a-minute boot promise, and they are a repo setting, not
a file in this project.

On the repo: **Settings → Codespaces → Prebuilds → Set up prebuild**. Point it
at the default branch and the devcontainer in `.devcontainer/devcontainer.json`,
then let the first prebuild finish before the workshop. After that, new
Codespaces start from the prebuilt image with dependencies already installed.
