import { buildSystemPrompt } from "@/lib/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const MAX_HISTORY = 20;
const MAX_MESSAGE_CHARS = 4_000;

/**
 * POST /api/chat
 * Body: { messages: {role, content}[] }
 * Streams plain-text deltas from any OpenAI-compatible chat completions endpoint.
 */
export async function POST(req: Request): Promise<Response> {
  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = (process.env.LLM_BASE_URL ?? "https://api.deepseek.com/v1").replace(/\/$/, "");
  const model = process.env.LLM_MODEL ?? "deepseek-chat";
  const maxTokens = Number(process.env.LLM_MAX_TOKENS ?? 1024);

  if (!apiKey) {
    return new Response("Server is missing LLM_API_KEY.", { status: 500 });
  }

  let messages: ChatMessage[];
  try {
    const body = (await req.json()) as { messages?: unknown };
    if (!Array.isArray(body.messages)) throw new Error("bad body");
    messages = body.messages
      .filter(
        (m): m is ChatMessage =>
          typeof m === "object" &&
          m !== null &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string",
      )
      .slice(-MAX_HISTORY)
      .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }));
  } catch {
    return new Response("Invalid request body.", { status: 400 });
  }
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return new Response("Last message must be from the user.", { status: 400 });
  }

  const upstream = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      stream: true,
      max_tokens: maxTokens,
      temperature: 0.7,
      messages: [{ role: "system", content: buildSystemPrompt() }, ...messages],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    console.error("LLM upstream error", upstream.status, detail);
    return new Response("Upstream model error.", { status: 502 });
  }

  // Translate OpenAI SSE ("data: {...}") into a raw text stream of content deltas.
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const raw of lines) {
            const line = raw.trim();
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (data === "[DONE]") continue;
            try {
              const json = JSON.parse(data);
              const delta: string | undefined = json.choices?.[0]?.delta?.content;
              if (delta) controller.enqueue(encoder.encode(delta));
            } catch {
              /* ignore malformed chunk */
            }
          }
        }
      } catch (err) {
        console.error("stream error", err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
