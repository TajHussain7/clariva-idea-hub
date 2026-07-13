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

const MAX_RETRIES_PER_SLOT = 2;
const DEFAULT_RETRY_WAIT_MS = 30_000;

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
      client: new OpenAI({ baseURL: baseUrl, apiKey: keyN }),
    });
  }

  // Groq / GROK Fallback Slot
  const groqKey = process.env.GROQ_API_KEY || process.env.GROK_API_KEY;
  if (groqKey) {
    slots.push({
      index: slots.length + 1,
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
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

// Slots are discovered once at module load time (not per request)
const AI_SLOTS: AIRouterSlot[] = discoverSlots();

/**
 * Attempts a chat completion across all configured AI slots in order.
 *
 * Behavior per slot:
 *   - On success: returns immediately with the result
 *   - On 429 (rate limit): waits Retry-After seconds, retries up to MAX_RETRIES_PER_SLOT times
 *                          within the same slot, then moves to the next slot
 *   - On 5xx / timeout: moves immediately to the next slot
 *   - If all slots exhausted: throws an AggregateError
 */
export async function routeCompletion(
  request: ChatCompletionRequest
): Promise<AIRouterResult> {
  const errors: Error[] = [];

  for (const slot of AI_SLOTS) {
    let attempt = 0;

    while (attempt < MAX_RETRIES_PER_SLOT) {
      attempt++;
      try {
        const completion = await slot.client.chat.completions.create({
          model: slot.model,
          max_tokens: request.max_tokens ?? 4096,
          temperature: request.temperature ?? 0.3,
          messages: request.messages,
        });

        const content = completion.choices[0]?.message?.content ?? "";
        return {
          content,
          modelUsed: slot.model,
          slotUsed: slot.index,
          attemptsTaken: attempt,
        };
      } catch (err: unknown) {
        const httpStatus = (err as { status?: number })?.status;
        const errMsg = err instanceof Error ? err.message : String(err);

        if (httpStatus === 429) {
          // Rate limited — respect the provider's Retry-After
          const retryAfterSec =
            (
              err as {
                error?: { metadata?: { retry_after_seconds?: number } };
              }
            )?.error?.metadata?.retry_after_seconds ?? DEFAULT_RETRY_WAIT_MS / 1000;

          const waitMs = Math.ceil(retryAfterSec) * 1000;

          if (attempt < MAX_RETRIES_PER_SLOT) {
            // Retry within this slot after waiting
            console.warn(
              `[AIRouter] Slot ${slot.index} (${slot.model}): rate-limited, waiting ${Math.ceil(retryAfterSec)}s before retry (attempt ${attempt}/${MAX_RETRIES_PER_SLOT})`
            );
            await new Promise((resolve) => setTimeout(resolve, waitMs));
            continue; // retry same slot
          }
          // Exhausted retries on this slot — move to next
          errors.push(new Error(`Slot ${slot.index} (${slot.model}): rate-limited after ${attempt} attempts`));
          break;
        }

        // Non-429 error (5xx, timeout, auth error, etc.) — move to next slot immediately
        errors.push(new Error(`Slot ${slot.index} (${slot.model}): ${errMsg}`));
        break;
      }
    }
  }

  // All slots failed
  throw new AggregateError(
    errors,
    `AI Router: all ${AI_SLOTS.length} slot(s) failed. Errors: ${errors.map((e) => e.message).join(" | ")}`
  );
}

/**
 * Returns summary info about discovered slots (for health/debug logging).
 */
export function getRouterStatus(): Array<{ slot: number; model: string }> {
  return AI_SLOTS.map((s) => ({ slot: s.index, model: s.model }));
}
