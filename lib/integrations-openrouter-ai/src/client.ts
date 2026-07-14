import OpenAI from "openai";

// Lazily construct the client so the server can start (and non-AI routes can
// serve requests) even when the OpenRouter integration isn't configured yet.
// The error is only raised when a caller actually tries to use the client.
let cachedClient: OpenAI | null = null;

function createClient(): OpenAI {
  if (!process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL) {
    throw new Error(
      "AI_INTEGRATIONS_OPENROUTER_BASE_URL must be set. Did you forget to provision the OpenRouter AI integration?",
    );
  }

  if (!process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY) {
    throw new Error(
      "AI_INTEGRATIONS_OPENROUTER_API_KEY must be set. Did you forget to provision the OpenRouter AI integration?",
    );
  }

  return new OpenAI({
    baseURL: process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL,
    apiKey: process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY,
  });
}

export const openrouter = new Proxy({} as OpenAI, {
  get(_target, prop, receiver) {
    if (!cachedClient) {
      cachedClient = createClient();
    }
    return Reflect.get(cachedClient, prop, receiver);
  },
});
