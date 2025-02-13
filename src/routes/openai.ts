import { Router, Request, Response } from "express";
import fetch from "node-fetch";

export const openAiRouter = Router();

openAiRouter.post("/chat", async (req: Request, res: Response) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: "Brak klucza API" });
  }

  const { model, messages, stream } = req.body;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  (res as any).flushHeaders?.();

  try {
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.log("OpenAI error:", errorText);
      res.write(`event: error\ndata: ${JSON.stringify({ error: errorText })}\n\n`);
      return res.end();
    }

    const decoder = new TextDecoder();
    let buffer = "";

    openaiResponse.body?.on("data", (chunk: Buffer) => {
      const decoded = decoder.decode(chunk, { stream: true });
      buffer += decoded;
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith("data: ")) {
          const jsonStr = trimmed.substring("data: ".length);
          if (jsonStr === "[DONE]") {
            res.write("event: end\ndata:\n\n");
            return res.end();
          }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content || "";
            if (content) {
              res.write(`event: message\ndata: ${JSON.stringify({ content })}\n\n`);
            }
          } catch (err) {
            console.log("Błąd parsowania chunku SSE:", err);
          }
        }
      }
    });

    openaiResponse.body?.on("end", () => {
      res.write(`event: end\ndata:\n\n`);
      res.end();
    });

    openaiResponse.body?.on("error", (err: any) => {
      console.error("OpenAI SSE error:", err);
      res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    });
  } catch (error) {
    console.error("Wyjątek w SSE handlerze (POST /chat):", error);
    res.write(`event: error\ndata: ${JSON.stringify({ error: (error as Error).message })}\n\n`);
    res.end();
  }
});
