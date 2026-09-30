import { buildSystemPrompt } from "@/lib/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = (process.env.LLM_BASE_URL ?? "https://api.deepseek.com/v1").replace(/\/$/, "");
  const model = process.env.LLM_MODEL ?? "deepseek-chat";

  if (!apiKey) {
    return new Response("Server is missing LLM_API_KEY.", { status: 500 });
  }

  let messages: ChatMessage[];
  try {
    const body = (await request.json()) as { messages?: unknown };
    if (!Array.isArray(body.messages)) throw new Error("invalid messages");
    messages = body.messages
      .filter(
        (message): message is ChatMessage =>
          typeof message === "object" &&
          message !== null &&
          ((message as ChatMessage).role === "user" || (message as ChatMessage).role === "assistant") &&
          typeof (message as ChatMessage).content === "string",
      )
      .slice(-20)
      .map((message) => ({ ...message, content: message.content.slice(0, 4000) }));
  } catch {
    return new Response("Invalid request body.", { status: 400 });
  }

  if (!messages.length || messages.at(-1)?.role !== "user") {
    return new Response("Last message must be from the user.", { status: 400 });
  }

  const upstream = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, stream: true, max_tokens: 1024, temperature: 0.7, messages: [{ role: "system", content: buildSystemPrompt() }, ...messages] }),
  });

  if (!upstream.ok || !upstream.body) {
    console.error("LLM upstream error", upstream.status);
    return new Response("Upstream model error.", { status: 502 });
  }

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
              const delta = json.choices?.[0]?.delta?.content;
              if (typeof delta === "string") controller.enqueue(encoder.encode(delta));
            } catch {
              // Ignore malformed SSE chunks.
            }
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" } });
}
