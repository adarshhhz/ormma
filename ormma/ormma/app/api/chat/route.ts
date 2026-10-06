import { SYSTEM_PROMPT } from "@/lib/systemPrompt";

export const runtime = "nodejs";

type ChatMessage = { role: "user" | "assistant"; content: string };

// Models are tried in order until one works. Free models change often, so set
// OPENROUTER_MODEL in Vercel (one name, or several separated by commas) to override.
// Browse https://openrouter.ai/models and filter by "free".
const DEFAULT_MODELS = ["inclusionai/ling-3.1-flash", "upstage/solar-mini4"];

function getModels(): string[] {
  const fromEnv = (process.env.OPENROUTER_MODEL ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return fromEnv.length > 0 ? fromEnv : DEFAULT_MODELS;
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Server is missing OPENROUTER_API_KEY." }, { status: 500 });
  }

  let body: { messages?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const messages = (body.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return Response.json({ error: "Send at least one user message." }, { status: 400 });
  }

  let lastProblem = "unknown error";

  for (const model of getModels()) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("OpenRouter error", model, res.status, text);
        let detail = "";
        try {
          detail = JSON.parse(text)?.error?.message ?? "";
        } catch {
          // ignore parse errors
        }
        lastProblem = `${model}: HTTP ${res.status}${detail ? " - " + String(detail).slice(0, 160) : ""}`;
        continue;
      }

      const data = await res.json();
      const reply: string = data?.choices?.[0]?.message?.content ?? "";
      if (reply.trim()) {
        return Response.json({ reply });
      }
      lastProblem = `${model}: empty reply`;
    } catch (err) {
      console.error(err);
      lastProblem = `${model}: network error`;
    }
  }

  // The reason is safe to show (no secrets) and makes problems easy to diagnose.
  return Response.json(
    { error: `Ormma is having trouble right now. Please try again. (${lastProblem})` },
    { status: 502 }
  );
}
