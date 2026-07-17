import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

/**
 * AI Router — Multi-model, multi-key fallback system.
 *
 * Discovers API key slots from environment variables at startup:
 *   Slot 1 (primary):  AI_INTEGRATIONS_OPENROUTER_API_KEY   + AI_INTEGRATIONS_OPENROUTER_MODEL
 *   Slot 2 (future):   AI_INTEGRATIONS_OPENROUTER_API_KEY_2 + AI_INTEGRATIONS_OPENROUTER_MODEL_2
 *   Slot 3 (future):   AI_INTEGRATIONS_OPENROUTER_API_KEY_3 + AI_INTEGRATIONS_OPENROUTER_MODEL_3
 *
 * To add a new AI key, simply add to .env (no code changes needed):
 *   AI_INTEGRATIONS_OPENROUTER_API_KEY_2=sk-or-v1-...
 *   AI_INTEGRATIONS_OPENROUTER_MODEL_2=google/gemini-flash-1.5:free
 */

export interface AIRouterSlot {
  index: number;
  model: string;
  fallbackModel: string;
  client: OpenAI;
}

export interface ChatCompletionRequest {
  messages: ChatCompletionMessageParam[];
  max_tokens?: number;
  temperature?: number;
}

export interface AIRouterResult {
  content: string;
  modelUsed: string;
  slotUsed: number;
  attemptsTaken: number;
}

// Default free models to use per slot when no override is specified
const DEFAULT_MODELS: Record<number, string> = {
  1: "meta-llama/llama-3.3-70b-instruct:free",
  2: "google/gemma-3-27b-it:free",
  3: "mistralai/mistral-7b-instruct:free",
};

// Default fallback models to use per slot when primary model fails
const DEFAULT_FALLBACK_MODELS: Record<number, string> = {
  1: "google/gemma-3-27b-it:free",
  2: "mistralai/mistral-7b-instruct:free",
  3: "google/gemini-flash-1.5:free",
};

const MAX_RETRIES_PER_SLOT = 3;
const DEFAULT_RETRY_WAIT_MS = 30_000;

/**
 * State Management & Concurrency Control
 */
export interface KeyState {
  index: number;
  errorCount: number;
  cooldownUntil: number; // timestamp in ms
  isSkipped: boolean; // skipped session-wide (for 401/402 auth/payment errors)
}

const keyStates = new Map<number, KeyState>();

class StateMutex {
  private locked = false;
  private queue: Array<() => void> = [];

  async acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) {
        next();
        return;
      }
    }
    this.locked = false;
  }
}

const stateMutex = new StateMutex();

function initKeyStates(slots: AIRouterSlot[]): void {
  for (const slot of slots) {
    if (!keyStates.has(slot.index)) {
      keyStates.set(slot.index, {
        index: slot.index,
        errorCount: 0,
        cooldownUntil: 0,
        isSkipped: false,
      });
    }
  }
}

/**
 * Credentials safety helper. Only prints the last 6 characters of the key.
 */
function maskKey(key: string): string {
  if (!key) return "unknown";
  if (key.length <= 8) return "***";
  return `${key.slice(0, 4)}...${key.slice(-6)}`;
}

/**
 * Error classification helpers
 */
function isTimeoutError(err: any): boolean {
  if (!err) return false;
  const errMsg = err.message ? String(err.message).toLowerCase() : "";
  const errName = err.name ? String(err.name) : "";
  return (
    err.status === 408 ||
    errName === "APITimeoutError" ||
    errMsg.includes("timeout") ||
    errMsg.includes("timedout") ||
    err.code === "ETIMEDOUT" ||
    err.code === "ECONNABORTED"
  );
}

function isTransientServerError(err: any): boolean {
  if (!err) return false;
  const status = err.status;
  if (status === 500 || status === 502 || status === 503 || status === 504) {
    return true;
  }
  const errMsg = err.message ? String(err.message).toLowerCase() : "";
  return (
    errMsg.includes("500") ||
    errMsg.includes("502") ||
    errMsg.includes("503") ||
    errMsg.includes("504") ||
    errMsg.includes("bad gateway") ||
    errMsg.includes("service unavailable") ||
    errMsg.includes("internal server error")
  );
}

function isAuthOrPaymentError(err: any): boolean {
  if (!err) return false;
  const status = err.status;
  if (status === 401 || status === 402) {
    return true;
  }
  const errMsg = err.message ? String(err.message).toLowerCase() : "";
  return (
    errMsg.includes("401") ||
    errMsg.includes("402") ||
    errMsg.includes("unauthorized") ||
    errMsg.includes("invalid api key") ||
    errMsg.includes("payment required") ||
    errMsg.includes("credit")
  );
}

function isRateLimitError(err: any): boolean {
  if (!err) return false;
  if (err.status === 429) return true;
  const errMsg = err.message ? String(err.message).toLowerCase() : "";
  return (
    errMsg.includes("429") ||
    errMsg.includes("rate limit") ||
    errMsg.includes("too many requests")
  );
}

/**
 * Concurrency-safe slot selection logic
 */
async function selectNextSlot(slots: AIRouterSlot[]): Promise<AIRouterSlot> {
  await stateMutex.acquire();
  try {
    initKeyStates(slots);
    const now = Date.now();
    const activeSlots: AIRouterSlot[] = [];
    const cooldownSlots: Array<{ slot: AIRouterSlot; cooldownUntil: number }> = [];

    for (const slot of slots) {
      const state = keyStates.get(slot.index)!;
      if (state.isSkipped) {
        continue;
      }
      if (state.cooldownUntil > now) {
        cooldownSlots.push({ slot, cooldownUntil: state.cooldownUntil });
        continue;
      }
      activeSlots.push(slot);
    }

    if (activeSlots.length === 0) {
      if (cooldownSlots.length > 0) {
        cooldownSlots.sort((a, b) => a.cooldownUntil - b.cooldownUntil);
        const earliest = cooldownSlots[0]!;
        const secondsLeft = Math.ceil((earliest.cooldownUntil - now) / 1000);
        throw new Error(
          `AI Router: All active API keys are currently in cooldown. Earliest available key (Slot ${earliest.slot.index}) in ${secondsLeft}s.`
        );
      } else {
        throw new Error("AI Router: No active API keys configured or all keys are permanently skipped.");
      }
    }

    // Healthiest key first (lowest errorCount). Tie-breaker: original index order
    activeSlots.sort((a, b) => {
      const stateA = keyStates.get(a.index)!;
      const stateB = keyStates.get(b.index)!;
      if (stateA.errorCount !== stateB.errorCount) {
        return stateA.errorCount - stateB.errorCount;
      }
      return a.index - b.index;
    });

    return activeSlots[0]!;
  } finally {
    stateMutex.release();
  }
}

/**
 * Concurrency-safe state update helpers
 */
async function recordSuccess(slotIndex: number): Promise<void> {
  await stateMutex.acquire();
  try {
    const state = keyStates.get(slotIndex);
    if (state) {
      state.errorCount = 0;
      state.cooldownUntil = 0;
    }
  } finally {
    stateMutex.release();
  }
}

async function recordFailure(
  slotIndex: number,
  isPermanent: boolean,
  cooldownDurationMs: number = 0
): Promise<void> {
  await stateMutex.acquire();
  try {
    const state = keyStates.get(slotIndex);
    if (state) {
      state.errorCount += 1;
      if (isPermanent) {
        state.isSkipped = true;
      }
      if (cooldownDurationMs > 0) {
        state.cooldownUntil = Date.now() + cooldownDurationMs;
      }
    }
  } finally {
    stateMutex.release();
  }
}

/**
 * Discovers all configured AI slots from environment variables.
 */
function discoverSlots(): AIRouterSlot[] {
  const baseUrl = process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL;
  if (!baseUrl) {
    throw new Error(
      "AI_INTEGRATIONS_OPENROUTER_BASE_URL must be set in environment variables."
    );
  }

  const slots: AIRouterSlot[] = [];

  // Slot 1 (primary) — uses the base key without suffix
  const key1 = process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY;
  if (key1) {
    slots.push({
      index: 1,
      model: process.env.AI_INTEGRATIONS_OPENROUTER_MODEL ?? DEFAULT_MODELS[1]!,
      fallbackModel:
        process.env.AI_INTEGRATIONS_OPENROUTER_MODEL_FALLBACK ??
        DEFAULT_FALLBACK_MODELS[1]!,
      client: new OpenAI({ baseURL: baseUrl, apiKey: key1 }),
    });
  }

  // Slots 2, 3, ... — uses numbered suffixes
  for (let i = 2; i <= 10; i++) {
    const keyN = process.env[`AI_INTEGRATIONS_OPENROUTER_API_KEY_${i}`];
    if (!keyN) break; // Stop at first missing slot
    slots.push({
      index: i,
      model:
        process.env[`AI_INTEGRATIONS_OPENROUTER_MODEL_${i}`] ??
        DEFAULT_MODELS[i] ??
        DEFAULT_MODELS[1]!,
      fallbackModel:
        process.env[`AI_INTEGRATIONS_OPENROUTER_MODEL_${i}_FALLBACK`] ??
        DEFAULT_FALLBACK_MODELS[i] ??
        DEFAULT_FALLBACK_MODELS[1]!,
      client: new OpenAI({ baseURL: baseUrl, apiKey: keyN }),
    });
  }

  // Groq / GROK Fallback Slot
  const groqKey = process.env.GROQ_API_KEY || process.env.GROK_API_KEY;
  if (groqKey) {
    slots.push({
      index: slots.length + 1,
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      fallbackModel: process.env.GROQ_MODEL_FALLBACK || "gemma2-9b-it",
      client: new OpenAI({
        baseURL: "https://api.groq.com/openai/v1",
        apiKey: groqKey,
      }),
    });
  }

  if (slots.length === 0) {
    throw new Error(
      "No AI API keys configured. Set AI_INTEGRATIONS_OPENROUTER_API_KEY or GROK_API_KEY in your .env file."
    );
  }

  return slots;
}

// Slots are discovered lazily on first use (not at module load time) so the
// server can start without failing hard when the AI integration isn't
// configured yet. Routes that need AI will surface the error when called.
let cachedSlots: AIRouterSlot[] | null = null;
function getSlots(): AIRouterSlot[] {
  if (!cachedSlots) {
    cachedSlots = discoverSlots();
  }
  return cachedSlots;
}

/**
 * Attempts a chat completion across all configured AI slots in order.
 *
 * Behavior per slot:
 *   - On success: returns immediately with the result
 *   - On 429 (rate limit): waits Retry-After seconds (or backoff), retries up to MAX_RETRIES_PER_SLOT times
 *                          within the same slot, then moves to the next slot
 *   - On 5xx / timeout: retries with exponential backoff on the same slot, then moves to the next slot
 *   - On 401 / 402: skips the key session-wide, immediately falls back to the next slot
 *   - If all slots exhausted: throws an AggregateError
 */
export async function routeCompletion(
  request: ChatCompletionRequest
): Promise<AIRouterResult> {
  const errors: Error[] = [];
  const slots = getSlots();

  // Track slots tried in the scope of this single completion request
  const triedSlots = new Set<number>();

  while (triedSlots.size < slots.length) {
    let slot: AIRouterSlot;
    try {
      const candidates = slots.filter((s) => !triedSlots.has(s.index));
      slot = await selectNextSlot(candidates);
    } catch (err: any) {
      errors.push(err);
      break;
    }

    triedSlots.add(slot.index);
    const maskedKey = maskKey(slot.client.apiKey);

    let attempt = 0;
    const maxRetries = MAX_RETRIES_PER_SLOT;

    while (attempt < maxRetries) {
      attempt++;
      // Model fallback: use fallbackModel for subsequent retries on the same key
      const currentModel = attempt > 1 ? slot.fallbackModel : slot.model;

      try {
        console.log(
          `[AIRouter] Trying Slot ${slot.index} (${currentModel}) using key ${maskedKey} (attempt ${attempt}/${maxRetries})`
        );

        const completion = await slot.client.chat.completions.create({
          model: currentModel,
          max_tokens: request.max_tokens ?? 4096,
          temperature: request.temperature ?? 0.3,
          messages: request.messages,
        });

        const content = completion.choices[0]?.message?.content ?? "";

        // Reset error count on success
        await recordSuccess(slot.index);

        return {
          content,
          modelUsed: currentModel,
          slotUsed: slot.index,
          attemptsTaken: attempt,
        };
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn(
          `[AIRouter] Slot ${slot.index} (${currentModel}) failed: ${errMsg}`
        );

        // Classification 1: Auth or Payment Error (Permanent) -> skip session-wide
        if (isAuthOrPaymentError(err)) {
          console.error(
            `[AIRouter] Slot ${slot.index} key (${maskedKey}) hit authentication/payment failure. Skipping key session-wide.`
          );
          await recordFailure(slot.index, true, 0);
          errors.push(
            new Error(`Slot ${slot.index} (${currentModel}) permanent error: ${errMsg}`)
          );
          break; // break retry loop, try next slot
        }

        // Classification 2: Rate Limit (429) -> put in cooldown and retry (with backoff)
        if (isRateLimitError(err)) {
          const retryAfterSec =
            (
              err as {
                error?: { metadata?: { retry_after_seconds?: number } };
              }
            )?.error?.metadata?.retry_after_seconds ??
            (err as any)?.headers?.["retry-after"] ??
            DEFAULT_RETRY_WAIT_MS / 1000;

          const waitMs = Math.ceil(Number(retryAfterSec)) * 1000;

          console.warn(
            `[AIRouter] Slot ${slot.index} key (${maskedKey}) rate-limited. Cooldown for ${Math.ceil(retryAfterSec)}s.`
          );

          // Mark failure and set cooldown
          await recordFailure(slot.index, false, waitMs);
          errors.push(
            new Error(`Slot ${slot.index} (${currentModel}) rate-limited: ${errMsg}`)
          );

          if (attempt < maxRetries) {
            console.log(
              `[AIRouter] Waiting ${waitMs}ms before retrying slot ${slot.index}...`
            );
            await new Promise((resolve) => setTimeout(resolve, waitMs));
            continue; // retry loop within slot
          }
          break; // retry limit reached, move to next slot
        }

        // Classification 3: Transient Server Error or Timeout -> retry with exponential backoff
        if (isTransientServerError(err) || isTimeoutError(err)) {
          const backoffMs = Math.pow(2, attempt) * 1000; // 2s, 4s, etc.

          console.warn(
            `[AIRouter] Slot ${slot.index} key (${maskedKey}) transient failure (attempt ${attempt}/${maxRetries}). Retrying in ${backoffMs}ms.`
          );

          // Record failure; if exhausted, put in standard cooldown
          const cooldownMs =
            attempt === maxRetries ? DEFAULT_RETRY_WAIT_MS : 0;
          await recordFailure(slot.index, false, cooldownMs);
          errors.push(
            new Error(`Slot ${slot.index} (${currentModel}) transient/timeout: ${errMsg}`)
          );

          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
            continue; // retry loop within slot
          }
          break;
        }

        // Classification 4: Generic/Unknown error -> record failure and retry
        console.warn(
          `[AIRouter] Slot ${slot.index} key (${maskedKey}) unknown failure (attempt ${attempt}/${maxRetries}).`
        );
        const cooldownMs = attempt === maxRetries ? DEFAULT_RETRY_WAIT_MS : 0;
        await recordFailure(slot.index, false, cooldownMs);
        errors.push(
          new Error(`Slot ${slot.index} (${currentModel}) unknown error: ${errMsg}`)
        );

        if (attempt < maxRetries) {
          const waitMs = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue; // retry loop within slot
        }
        break;
      }
    }
  }

  // All slots failed or exhausted
  throw new AggregateError(
    errors,
    `AI Router: all ${slots.length} slot(s) failed. Errors: ${errors
      .map((e) => e.message)
      .join(" | ")}`
  );
}

/**
 * Returns summary info about discovered slots (for health/debug logging).
 */
export function getRouterStatus(): Array<{ slot: number; model: string }> {
  return getSlots().map((s) => ({ slot: s.index, model: s.model }));
}
