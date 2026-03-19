const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const DEFAULT_API_URL = process.env.OPENAI_API_URL || "https://api.openai.com/v1/chat/completions";
const SUGGESTION_COUNT = Number(process.env.EVALUATION_AI_SUGGESTION_COUNT || "20") || 20;
const MAX_ATTEMPTS = Number(process.env.EVALUATION_AI_MAX_ATTEMPTS || "2") || 2;

function buildAudienceLabel({ sport, ageGroup, gender, teamLevel }) {
  const parts = [];
  if (ageGroup) parts.push(ageGroup);
  if (gender && gender.toLowerCase() !== "coed") parts.push(gender);
  if (teamLevel) parts.push(teamLevel);
  parts.push(sport);
  return parts
    .map((part) => (part || "").trim())
    .filter(Boolean)
    .join(" ");
}

function buildUserPrompt(input) {
  const audience = buildAudienceLabel(input);
  return `Sport: ${input.sport}\nEvaluation category: ${input.evaluationCategory}\nRequested difficulty: ${input.complexity}\nAudience details: ${audience || "General"}\n\nRespond ONLY with valid JSON shaped exactly like {\"suggestions\": [ ...${SUGGESTION_COUNT} unique items... ]}. Each suggestion object must include name, instructions, objective, categories (values from {technical, physical, tactical, mental, decision_making, discipline}), scoring_method (numeric_scale | rating_scale | custom_metric), scoring_config (matching the method), and difficulty (easy | medium | hard). Do not include prose outside the JSON.`;
}

function coerceJson(text) {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  const fencedMatch = trimmed.match(/```json\s*([\s\S]+?)\s*```/i);
  const payload = fencedMatch ? fencedMatch[1] : trimmed;
  try {
    return JSON.parse(payload);
  } catch (err) {
    console.warn("[openAI] failed to parse suggestions", err.message);
    return null;
  }
}

export function createOpenAISuggestionProvider({
  apiKey,
  model = DEFAULT_MODEL,
  apiUrl = DEFAULT_API_URL,
  temperature = Number(process.env.OPENAI_TEMPERATURE || "0.4"),
} = {}) {
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required to enable evaluation AI suggestions");
  }

  const responseFormat = { type: "json_object" };

  async function requestBatch(batchInput) {
    const body = {
      model,
      temperature,
      response_format: responseFormat,
      messages: [
        {
          role: "system",
          content:
            "You are an elite high-performance coaching assistant. Generate evaluation building blocks coaches can drop into a weekly development plan. Ensure drills feel practical, measurable, and balanced across skills vs conditioning vs game IQ.",
        },
        {
          role: "user",
          content: buildUserPrompt(batchInput),
        },
      ],
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const err = new Error(`openai_request_failed:${response.status}`);
      err.meta = { status: response.status, body: errorText };
      throw err;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    const parsed = coerceJson(content);
    if (!parsed || !Array.isArray(parsed.suggestions)) {
      return [];
    }

    return parsed.suggestions;
  }

  return async function openAISuggestionProvider(input) {
    const aggregated = [];
    const seenNames = new Set();
    let attempt = 0;

    while (aggregated.length < SUGGESTION_COUNT && attempt < MAX_ATTEMPTS) {
      const batch = await requestBatch(input);
      for (const suggestion of batch) {
        const key = (suggestion?.name || "").trim().toLowerCase();
        if (!key || seenNames.has(key)) continue;
        aggregated.push(suggestion);
        seenNames.add(key);
        if (aggregated.length === SUGGESTION_COUNT) {
          break;
        }
      }
      attempt += 1;
      if (aggregated.length < SUGGESTION_COUNT && attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    if (!aggregated.length) {
      throw new Error("openai_no_suggestions");
    }

    if (aggregated.length < SUGGESTION_COUNT) {
      console.warn("[evaluation-ai] provider returned fewer suggestions", {
        requested: SUGGESTION_COUNT,
        received: aggregated.length,
      });
    }

    return aggregated.slice(0, SUGGESTION_COUNT);
  };
}
