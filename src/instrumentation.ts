/**
 * Next.js instrumentation — runs ONCE at server startup, before any request is
 * handled (so it lands before the first model call). We use it to silence two
 * benign-but-noisy AI SDK warnings that otherwise spam the server console on
 * every run:
 *   - "specificationVersion … compatibility mode" — the OpenAI-compat shim the
 *     Cloudflare AI Gateway is reached through. Cosmetic.
 *   - "System messages … prompt injection" — a best-practice nag about how
 *     CopilotKit assembles the system prompt. Not an actual vulnerability here.
 * Neither affects behavior; this just keeps the console clean for the room.
 */
export function register() {
  (globalThis as typeof globalThis & { AI_SDK_LOG_WARNINGS?: boolean }).AI_SDK_LOG_WARNINGS =
    false;
}
