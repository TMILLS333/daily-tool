import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Intentionally minimal. The backend stays sealed machinery;
  // attendees customize the front-end layers (data, rules, catalog, style).
};

export default nextConfig;

// Lets `next dev` run against the same Cloudflare bindings the deployed Worker
// uses, so local dev and the Cloudflare build share one codebase. Safe in dev;
// no effect on `next build`.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
