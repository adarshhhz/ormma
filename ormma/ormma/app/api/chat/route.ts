import { SYSTEM_PROMPT } from "@/lib/systemPrompt";

export const runtime = "nodejs";

type ChatMessage = { role: "user" | "assistant"; content: string };

// Pick a model at https://openrouter.ai/models (filter by "free").
// Set OPENROUTER_MODEL in your environment to change it without editing code.
const DEFAULT_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

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

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
        max_tokens: 1024,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      }),
    });

    if (!res.ok) {
      console.error("OpenRouter error", res.status, await res.text());
      return Response.json({ error: "Ormma is having trouble right now. Please try again." }, { status: 502 });
    }

    const data = await res.json();
    const reply: string = data?.choices?.[0]?.message?.content ?? "";
    if (!reply) {
      return Response.json({ error: "Ormma had no answer this time. Please try again." }, { status: 502 });
    }

    return Response.json({ reply });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Ormma is having trouble right now. Please try again." }, { status: 500 });
  }
}
