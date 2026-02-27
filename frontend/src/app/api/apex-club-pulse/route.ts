import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          pulse: {
            score: 74,
            summary: "Club operations are stable with moderate risk around attendance and unpaid subscriptions.",
            insights: [
              "U14/U15 attendance trend is below target for upcoming sessions.",
              "Unpaid subscriptions are concentrated in 3 teams.",
              "Tryout conversions are healthy but check-in completion can improve.",
            ],
            actions: [
              "Send attendance nudges 24h before U14/U15 events.",
              "Trigger payment reminders for top 3 unpaid teams.",
              "Assign one coach to check-in desk workflow for tryout day.",
            ],
          },
          source: "fallback",
        },
        { status: 200 },
      );
    }

    const prompt = `You are an AI operations assistant for a youth sports club dashboard.
Given this JSON metrics snapshot, return a concise pulse report.
${JSON.stringify(body ?? {}, null, 2)}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "club_pulse",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                score: { type: "number" },
                summary: { type: "string" },
                insights: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
                actions: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
              },
              required: ["score", "summary", "insights", "actions"],
            },
          },
        },
        messages: [
          { role: "system", content: "Be concrete, practical, and concise." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Model request failed");
    }

    const data = await response.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);

    return NextResponse.json({ pulse: parsed, source: "ai" }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unexpected error" }, { status: 500 });
  }
}
