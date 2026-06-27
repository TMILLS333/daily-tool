/**
 * Model resolver — picks which AI model the agent runs on, from the environment.
 *
 * Priority (highest first):
 *   1. MODEL override (advanced): "@cf/..." selects Workers AI (the route builds
 *      it via its SSE-coercion shim); any other value is used verbatim.
 *   2. Personal BYO key, precedence anthropic > openai > google -> that
 *      provider's default model. A personal key WINS over the gateway: an
 *      attendee who pastes their own key pays on their own key, and removing it
 *      drops them back onto the shared gateway.
 *   3. Cloudflare AI Gateway (the funded shared path) -> gateway transport.
 *   4. Nothing configured -> Gemini fallback + a clear server warning. The app
 *      still starts; a missing key surfaces as the existing in-app key error on
 *      the first run, rather than crashing the route at import.
 *
 * Blank / whitespace-only env values count as absent, so a leftover empty line
 * (e.g. ANTHROPIC_API_KEY=) does not strand an attendee who removed their key.
 */
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

type GatewayLanguageModel = ReturnType<
  ReturnType<typeof createOpenAICompatible>["chatModel"]
>;

/** A model spec BuiltInAgent accepts: a "provider/model" string, or a built model. */
export type ModelSpec = string | GatewayLanguageModel;

export type ModelSource =
  | "model-override"
  | "workers-ai"
  | "byo"
  | "gateway"
  | "fallback";

export type ByoProvider = "anthropic" | "openai" | "google";

export interface ResolvedModel {
  /** Pass straight to `new BuiltInAgent({ model })`. For source "workers-ai"
   *  this is the "@cf/..." id string; the route wraps it in resolveWorkersAI. */
  model: ModelSpec;
  source: ModelSource;
  /** Human-readable, for the server startup log. Never contains a key. */
  label: string;
}

// BYO defaults: the attendee pays, so default to each provider's
// cheap-but-capable tier. Override per run with MODEL.
// Anthropic is the deliberate exception: it pins SONNET (not a Haiku) to match
// the funded gateway, so any Anthropic path renders with the same Claude. (The
// old `claude-3.5-haiku` here was both retired — 404s as of Feb 2026 — and
// malformed: model ids use hyphens, not the dot. It was the real cause of the
// "an Anthropic key falls through to a dead model" failure, since the resolver
// order is anthropic > openai > google.)
const BYO_DEFAULT_MODEL: Record<ByoProvider, string> = {
  anthropic: "anthropic/claude-sonnet-4-6",
  openai: "openai/gpt-4.1-mini",
  google: "google/gemini-2.5-flash",
};

// Gateway default model (Tania funds this path via Unified Billing). Tania's
// choice 2026-06-26: Claude SONNET. The event LEADS with BYO Gemini (fast,
// free); the gateway is the FALLBACK Tania plugs in for specific folks, and
// there Sonnet's creativity is the whole point — its slower speed is an
// acceptable trade for a backup path, not the main one. The /compat endpoint
// uses {provider}/{model} ids with hyphens, not dots — verified live on this
// gateway: anthropic/claude-sonnet-4-6, anthropic/claude-haiku-4-5 (faster),
// openai/gpt-4.1-mini, google-ai-studio/gemini-2.5-flash. Override CF_AIG_MODEL.
const GATEWAY_DEFAULT_MODEL = "anthropic/claude-sonnet-4-6";

/** Trim and treat blank / whitespace-only as absent. */
function present(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Which personal provider key is set, by precedence anthropic > openai > google. */
export function detectByoProvider(
  env: NodeJS.ProcessEnv = process.env,
): ByoProvider | null {
  if (present(env.ANTHROPIC_API_KEY)) return "anthropic";
  if (present(env.OPENAI_API_KEY)) return "openai";
  if (present(env.GOOGLE_API_KEY)) return "google";
  return null;
}

/**
 * Plain, testable shape of a gateway request (no SDK object). Returns null when
 * the gateway is not fully configured (all three of account, gateway, token).
 */
export function buildGatewayConfig(env: NodeJS.ProcessEnv = process.env): {
  baseURL: string;
  headers: Record<string, string>;
  apiKey: string;
  modelId: string;
} | null {
  const account = present(env.CF_AIG_ACCOUNT_ID) ?? present(env.CF_ACCOUNT_ID);
  const gateway = present(env.CF_AIG_GATEWAY_ID);
  const token = present(env.CF_AIG_TOKEN);
  if (!account || !gateway || !token) return null;
  return {
    baseURL: `https://gateway.ai.cloudflare.com/v1/${account}/${gateway}/compat`,
    headers: { "cf-aig-authorization": `Bearer ${token}` },
    // Auth: send the AI Gateway token as BOTH the cf-aig-authorization header
    // (gateway access) and the OpenAI Bearer (Authorization). A bogus/empty
    // Authorization makes the gateway attempt provider pass-through and 401
    // (proven 2026-06-23), so we reuse the real token. For BYOK pass-through
    // with a stored provider key, set CF_AIG_PROVIDER_KEY instead.
    apiKey: present(env.CF_AIG_PROVIDER_KEY) ?? token,
    modelId: present(env.CF_AIG_MODEL) ?? GATEWAY_DEFAULT_MODEL,
  };
}

function gatewayModel(
  cfg: NonNullable<ReturnType<typeof buildGatewayConfig>>,
): GatewayLanguageModel {
  return createOpenAICompatible({
    name: "cf-ai-gateway",
    baseURL: cfg.baseURL,
    apiKey: cfg.apiKey,
    headers: cfg.headers,
  }).chatModel(cfg.modelId);
}

export function resolveModel(
  env: NodeJS.ProcessEnv = process.env,
): ResolvedModel {
  // Keep the Google key shim: the underlying SDK default looks for
  // GOOGLE_GENERATIVE_AI_API_KEY; our onboarding uses the short GOOGLE_API_KEY.
  if (!present(env.GOOGLE_GENERATIVE_AI_API_KEY) && present(env.GOOGLE_API_KEY)) {
    env.GOOGLE_GENERATIVE_AI_API_KEY = env.GOOGLE_API_KEY;
  }

  // 1. Explicit MODEL override (advanced: pin a model, or "@cf/..." Workers AI).
  //    Do NOT set MODEL in the gateway deployment — use CF_AIG_MODEL instead.
  const modelOverride = present(env.MODEL);
  if (modelOverride) {
    if (modelOverride.startsWith("@cf/")) {
      return {
        model: modelOverride,
        source: "workers-ai",
        label: `Workers AI (${modelOverride})`,
      };
    }
    return {
      model: modelOverride,
      source: "model-override",
      label: modelOverride,
    };
  }

  // 2. Personal BYO key wins over the gateway ("own key wins").
  const byo = detectByoProvider(env);
  if (byo) {
    const model = BYO_DEFAULT_MODEL[byo];
    return { model, source: "byo", label: `${byo} BYO (${model})` };
  }

  // 3. Funded shared path: Cloudflare AI Gateway.
  const cfg = buildGatewayConfig(env);
  if (cfg) {
    return {
      model: gatewayModel(cfg),
      source: "gateway",
      label: `AI Gateway (${cfg.modelId})`,
    };
  }

  // 4. Nothing configured. Don't crash the route at import — fall back to the
  //    Google default so the app still starts; a missing key then surfaces as
  //    the existing in-app key error on the first run.
  console.warn(
    "[model-resolver] No AI key detected. Add GOOGLE_API_KEY, ANTHROPIC_API_KEY, " +
      "or OPENAI_API_KEY to .env, or configure the Cloudflare AI Gateway " +
      "(CF_AIG_ACCOUNT_ID + CF_AIG_GATEWAY_ID + CF_AIG_TOKEN). Falling back to " +
      `${BYO_DEFAULT_MODEL.google}; runs will fail until a key is provided.`,
  );
  return {
    model: BYO_DEFAULT_MODEL.google,
    source: "fallback",
    label: "fallback (no key)",
  };
}
