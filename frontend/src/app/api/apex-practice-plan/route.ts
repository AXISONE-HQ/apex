import { NextResponse } from "next/server";

type Block = {
  title: string;
  description: string;
  outcome: string;
  minutes: number;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const focus = String(body?.focus ?? "skill");
    const complexity = String(body?.complexity ?? "med");
    const category = String(body?.category ?? "U15 boys");
    const duration = Number(body?.duration ?? 90);
    const sport = String(body?.sport ?? "Basketball");
    const team = String(body?.team ?? "Unknown team");
    const practiceType = String(body?.practiceType ?? "training");
    const measurable = Boolean(body?.measurable ?? false);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 400 });
    }

    const complexityGuide =
      complexity === "easy"
        ? "Easy: fundamentals, low cognitive load, high success rate, simple constraints."
        : complexity === "hard"
          ? "Hard: advanced decision-making, pressure constraints, game-speed execution."
          : "Medium: balanced challenge with progressive constraints.";

    const modeGuide =
      focus === "evaluation" || practiceType === "evaluation"
        ? "Evaluation mode: each block must assess a measurable skill with a clear benchmark target (e.g., 10 free throws, completion %, timed rep, score out of 10)."
        : "Training mode: each block should still include measurable outcomes (counts, %, time, or score).";

    const prompt = `Generate exactly 20 practice plan blocks for team ${team} (${category}) in sport ${sport}.
Focus: ${focus}. Practice type: ${practiceType}. Complexity: ${complexity}. ${complexityGuide}
Total session duration target: ${duration} minutes.
${modeGuide}
Category adaptation: calibrate drills, intensity, and benchmark targets to age/category ${category}.
All outcomes must be objectively measurable (counts, percentages, times, or scored rubric) and include the target threshold.
Use sport-specific terminology for ${sport}.
Return JSON only with fields: title, description, outcome, minutes.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.5,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "practice_blocks",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                blocks: {
                  type: "array",
                  minItems: 20,
                  maxItems: 20,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      outcome: { type: "string" },
                      minutes: { type: "number" },
                    },
                    required: ["title", "description", "outcome", "minutes"],
                  },
                },
              },
              required: ["blocks"],
            },
          },
        },
        messages: [
          {
            role: "system",
            content:
              "You are an elite youth sports coach planner. You must output measurable, benchmark-based blocks adapted to age category and requested complexity. Every outcome must contain a quantifiable target (count, %, time, or score threshold). Keep blocks concise and implementable.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: text || "Model request failed" }, { status: 500 });
    }

    const data = await response.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "{}";

    const parsed = JSON.parse(content) as { blocks?: Block[] };
    const isMeasurableOutcome = (txt: string) => /(\d+\s*(x|%|sec|min|minutes|shots|reps|attempts|out of|\/10|points?))/i.test(txt);

    const blocks = Array.isArray(parsed.blocks)
      ? parsed.blocks
          .filter(
            (b) =>
              b &&
              typeof b.title === "string" &&
              typeof b.description === "string" &&
              typeof b.outcome === "string" &&
              typeof b.minutes === "number",
          )
          .slice(0, 20)
          .map((b) => ({
            ...b,
            outcome:
              measurable && !isMeasurableOutcome(b.outcome)
                ? `${b.outcome} Target: minimum 8/10 successful reps per player.`
                : b.outcome,
          }))
      : [];

    return NextResponse.json({ blocks });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
