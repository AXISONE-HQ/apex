import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";

type SessionIndex = Record<string, { sessionFile?: string; updatedAt?: number }>;

function tailLines(text: string, n: number) {
  const lines = text.trim().split("\n");
  return lines.slice(Math.max(0, lines.length - n));
}

export async function GET() {
  try {
    const indexRaw = await readFile(
      "/Users/moltbot/.openclaw/agents/main/sessions/sessions.json",
      "utf8",
    );
    const index = JSON.parse(indexRaw) as SessionIndex;
    const main = index["agent:main:main"];
    if (!main?.sessionFile) {
      return NextResponse.json({ activity: "Idle", status: "completed" });
    }

    const sessionRaw = await readFile(main.sessionFile, "utf8");
    const recent = tailLines(sessionRaw, 200);

    let activity = "Idle";
    let timestamp = Date.now();

    for (let i = recent.length - 1; i >= 0; i--) {
      try {
        const row = JSON.parse(recent[i]);
        const msg = row?.message;
        if (!msg) continue;

        const role = msg.role as string | undefined;
        const content = Array.isArray(msg.content) ? msg.content : [];

        if (role === "assistant") {
          const toolCall = content.find((c: any) => c?.type === "toolCall");
          if (toolCall?.name) {
            activity = `Running tool: ${toolCall.name}`;
          } else {
            const thinking = content.find((c: any) => c?.type === "thinking")?.thinking;
            const text = content.find((c: any) => c?.type === "text")?.text;
            const raw = (thinking || text || "Working") as string;
            activity = raw.replace(/\s+/g, " ").slice(0, 120);
          }
          timestamp = (row?.message?.timestamp ?? Date.parse(row?.timestamp ?? "")) || Date.now();
          break;
        }

        if (role === "toolResult") {
          activity = `Processing tool result: ${msg.toolName ?? "tool"}`;
          timestamp = (row?.message?.timestamp ?? Date.parse(row?.timestamp ?? "")) || Date.now();
          break;
        }
      } catch {
        // ignore bad lines
      }
    }

    const ageMs = Date.now() - Number(timestamp || Date.now());
    const status = ageMs > 120000 ? "completed" : "in_progress";

    return NextResponse.json({ activity, status, ageMs });
  } catch {
    return NextResponse.json({ activity: "Idle", status: "completed" });
  }
}
