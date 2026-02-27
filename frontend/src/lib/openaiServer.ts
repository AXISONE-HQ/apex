type OpenAIChatRequest = {
  apiKey: string;
  body: Record<string, unknown>;
  timeoutMs?: number;
  maxRetries?: number;
};

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function openAIChatCompletion({
  apiKey,
  body,
  timeoutMs = 15000,
  maxRetries = 2,
}: OpenAIChatRequest) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (response.ok) {
        clearTimeout(timer);
        return response.json();
      }

      const text = await response.text();
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt === maxRetries) {
        throw new Error(text || `OpenAI request failed with status ${response.status}`);
      }

      await sleep(250 * (attempt + 1));
    } catch (err) {
      lastError = err instanceof Error ? err : new Error("openai_request_failed");
      if (attempt === maxRetries) throw lastError;
      await sleep(250 * (attempt + 1));
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError || new Error("openai_request_failed");
}
