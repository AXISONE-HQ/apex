import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sport = String(body?.sport ?? "Basketball");
    const team = String(body?.team ?? "Unknown team");
    const block = body?.block as { title?: string; description?: string; outcome?: string; minutes?: number };

    if (!block?.title) {
      return NextResponse.json({ error: "Missing block title" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 400 });
    }

    const prompt = `You are a professional ${sport} coach. Create practical execution instructions for this drill block for team ${team}.

Block:
- Title: ${block.title}
- Description: ${block.description ?? ""}
- Outcome: ${block.outcome ?? ""}
- Minutes: ${block.minutes ?? 0}

Return concise markdown with sections:
1) Setup
2) Step-by-step execution
3) Coaching cues
4) Common mistakes + fixes
5) Success criteria`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        messages: [
          { role: "system", content: "You are an elite youth coach. Be actionable and specific." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: await response.text() }, { status: 500 });
    }

    const data = await response.json();
    const instructions = data?.choices?.[0]?.message?.content?.trim() || "No instructions returned.";
    return NextResponse.json({ instructions });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unexpected error" }, { status: 500 });
  }
}
