import { buildSystemPrompt } from "@/lib/profile";
import { buildMemoryContext } from "@/lib/memory-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMessage = { role: "user" | "assistant"; content: string };
const MAX_HISTORY = 20;
const MAX_MESSAGE_CHARS = 4_000;
const MAX_TOKENS = 160;

function getTextContent(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value
    .map((part) => {
      if (typeof part === "string") return part;
      if (typeof part === "object" && part !== null && "text" in part) {
        const text = (part as { text?: unknown }).text;
        return typeof text === "string" ? text : "";
      }
      return "";
    })
    .join("");
}

function getDelta(payload: unknown): string {
  if (typeof payload !== "object" || payload === null) return "";
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== "object") return "";
  const choice = choices[0] as { delta?: { content?: unknown }; message?: { content?: unknown } };
  return getTextContent(choice.delta?.content ?? choice.message?.content);
}

function readErrorDetail(payload: string) {
  try {
    const parsed = JSON.parse(payload) as { error?: { message?: unknown } };
    return typeof parsed.error?.message === "string" ? parsed.error.message : "";
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.AGENT_API_KEY ?? process.env.LLM_API_KEY;
  const baseUrl = (process.env.AGENT_BASE_URL ?? process.env.LLM_BASE_URL ?? "https://api.deepseek.com").replace(/\/$/, "");
  const model = process.env.AGENT_MODEL ?? process.env.LLM_MODEL ?? "deepseek-flash";

  if (!apiKey) {
    return new Response("Agent is not configured. Set AGENT_API_KEY and AGENT_BASE_URL.", { status: 503 });
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
      .slice(-MAX_HISTORY)
      .map((message) => ({ role: message.role, content: message.content.trim().slice(0, MAX_MESSAGE_CHARS) }));
  } catch {
    return new Response("Invalid request body.", { status: 400 });
  }

  if (!messages.length || messages.at(-1)?.role !== "user") {
    return new Response("Last message must be from the user.", { status: 400 });
  }

  let upstream: Response;
  try {
    const latestQuestion = messages.filter((message) => message.role === "user").at(-1)?.content ?? "";
    const memoryContext = await buildMemoryContext(latestQuestion);
    upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, stream: true, max_tokens: MAX_TOKENS, temperature: 0.7, messages: [{ role: "system", content: buildSystemPrompt(memoryContext) }, ...messages] }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    console.error("Agent request failed", error);
    return new Response("Agent request failed.", { status: 502 });
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    console.error("Agent upstream error", upstream.status, readErrorDetail(detail));
    return new Response("Agent upstream error.", { status: 502 });
  }

  if (!upstream.body) {
    return new Response("Agent returned no response body.", { status: 502 });
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
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() ?? "";
          for (const raw of lines) {
            const line = raw.trim();
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (data === "[DONE]") continue;
            try {
              const json = JSON.parse(data);
              const delta = getDelta(json);
              if (delta) controller.enqueue(encoder.encode(delta));
            } catch {
              // Providers occasionally emit comments or partial events; skip them safely.
            }
          }
        }
        buffer += decoder.decode();
        if (buffer.trim().startsWith("data:")) {
          const data = buffer.trim().slice(5).trim();
          if (data && data !== "[DONE]") {
            try {
              const delta = getDelta(JSON.parse(data));
              if (delta) controller.enqueue(encoder.encode(delta));
            } catch {
              // Ignore an incomplete final event.
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
