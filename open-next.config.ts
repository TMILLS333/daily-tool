// OpenNext adapter config — transforms the Next.js build output into a
// Cloudflare Worker bundle. Defaults are correct for this app; we run with the
// standard Cloudflare preset and no custom caching overrides.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig();
