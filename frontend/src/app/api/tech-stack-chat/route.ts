import { NextResponse } from "next/server";
import { openAIChatCompletion } from "@/lib/openaiServer";

type IncomingMsg = { role: "user" | "assistant"; text: string };

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = Array.isArray(body?.messages) ? (body.messages as IncomingMsg[]) : [];
    const project = body?.project ?? null;
    const recommendations = Array.isArray(body?.recommendations) ? body.recommendations : [];
    const confirmedIds = Array.isArray(body?.confirmedIds) ? body.confirmedIds : [];

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { reply: "OPENAI_API_KEY is not configured yet. Add it to your environment to enable AI CTO chat." },
        { status: 200 },
      );
    }

    const system = [
      "You are an AI CTO/Software Architect advisor.",
      "Goal: refine a project's recommended tech stack.",
      "Be practical and concise. Focus on architecture trade-offs, risks, and implementation sequence.",
      "When useful, suggest 2 options with a preferred recommendation.",
      "Return output as JSON matching the provided schema.",
      "If user asks for specific tools (e.g., BigQuery), include them in recommendations.",
      "Recommendation items must include: layer, choice, reason.",
    ].join(" ");

    const confirmedRecommendations = recommendations.filter(
      (r: { id?: unknown }) => typeof r?.id === "string" && confirmedIds.includes(r.id),
    );

    const context = {
      project: project
        ? {
            name: project.name,
            description: project.description,
            targetMarket: project.targetMarket,
            features: project.features,
          }
        : null,
      recommendations,
      confirmedIds,
      confirmedRecommendations,
    };

    const history = messages.slice(-12).map((m) => ({ role: m.role, content: m.text }));

    const data = await openAIChatCompletion({
      apiKey,
      timeoutMs: 12000,
      maxRetries: 2,
      body: {
        model: "gpt-4o-mini",
        temperature: 0.4,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "tech_stack_chat",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                reply: { type: "string" },
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      layer: { type: "string" },
                      choice: { type: "string" },
                      reason: { type: "string" },
                    },
                    required: ["layer", "choice", "reason"],
                  },
                },
              },
              required: ["reply", "recommendations"],
            },
          },
        },
        messages: [
          { role: "system", content: system },
          { role: "system", content: `Project context:\n${JSON.stringify(context, null, 2)}` },
          ...history.map((m) => ({ role: m.role, content: m.content })),
        ],
      },
    });

    const content: string = data?.choices?.[0]?.message?.content?.trim() || "{}";

    try {
      const parsed = JSON.parse(content) as {
        reply?: unknown;
        recommendations?: Array<{ layer?: unknown; choice?: unknown; reason?: unknown }>;
      };

      const reply = typeof parsed.reply === "string" && parsed.reply.trim()
        ? parsed.reply.trim()
        : "I don't have a recommendation right now.";

      const parsedRecommendations = Array.isArray(parsed.recommendations)
        ? parsed.recommendations.filter(
            (x): x is { layer: string; choice: string; reason: string } =>
              typeof x?.layer === "string" &&
              typeof x?.choice === "string" &&
              typeof x?.reason === "string",
          )
        : [];

      return NextResponse.json({ reply, recommendations: parsedRecommendations });
    } catch {
      return NextResponse.json({
        reply: content || "I couldn't parse a structured recommendation response.",
        recommendations: [],
      });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ reply: `Unexpected error: ${msg}` }, { status: 200 });
  }
}
