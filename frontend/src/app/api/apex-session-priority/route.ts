import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const apiKey = process.env.OPENAI_API_KEY;

    const fallback = {
      title: "Based on upcoming games + eval trends, here are 5 practice blocks to prioritize",
      blocks: [
        "Transition defense recovery reps (12 min)",
        "Decision-making under pressure 3v2/2v1 (14 min)",
        "Set-play execution for late-game scenarios (10 min)",
        "Finishing quality: shot selection + release timing (10 min)",
        "Conditioned scrimmage with tactical constraints (16 min)",
      ],
    };

    if (!apiKey) {
      return NextResponse.json({ plan: fallback, source: "fallback" });
    }

    const prompt = `Create a concise weekly session priority output.
Return exactly:
- title: one sentence in this style: "Based on upcoming games + eval trends, here are 5 practice blocks to prioritize"
- blocks: array of 5 short, actionable practice priorities with estimated minutes.

Context JSON:
${JSON.stringify(body ?? {}, null, 2)}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.35,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "session_priority",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                title: { type: "string" },
                blocks: {
                  type: "array",
                  minItems: 5,
                  maxItems: 5,
                  items: { type: "string" },
                },
              },
              required: ["title", "blocks"],
            },
          },
        },
        messages: [
          { role: "system", content: "You are a head coach performance assistant. Keep output practical and concise." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ plan: fallback, source: "fallback" });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);

    return NextResponse.json({ plan: parsed, source: "ai" });
  } catch {
    return NextResponse.json({
      plan: {
        title: "Based on upcoming games + eval trends, here are 5 practice blocks to prioritize",
        blocks: [
          "Transition defense recovery reps (12 min)",
          "Decision-making under pressure 3v2/2v1 (14 min)",
          "Set-play execution for late-game scenarios (10 min)",
          "Finishing quality: shot selection + release timing (10 min)",
          "Conditioned scrimmage with tactical constraints (16 min)",
        ],
      },
      source: "fallback",
    });
  }
}
