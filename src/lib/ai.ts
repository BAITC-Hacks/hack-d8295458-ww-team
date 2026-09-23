/** Server-side only: never import this module from a client component. */
export async function askAI(systemPrompt: string, userText: string): Promise<{ text: string; source: "openai" | "nvidia" } | null> {
  const providers = [
    { source: "openai" as const, key: process.env.OPENAI_API_KEY, url: "https://api.openai.com/v1/chat/completions", model: "gpt-4o-mini" },
    { source: "nvidia" as const, key: process.env.NVIDIA_API_KEY, url: "https://integrate.api.nvidia.com/v1/chat/completions", model: "meta/llama-3.1-8b-instruct" },
  ];

  for (const provider of providers) {
    if (!provider.key?.trim()) continue;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(provider.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${provider.key.trim()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: provider.model, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userText }], temperature: 0.2, max_tokens: 4096, stream: false }),
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Provider unavailable");
      const result = await response.json();
      const text = result?.choices?.[0]?.message?.content;
      if (typeof text !== "string" || !text.trim() || result.choices[0].finish_reason === "length") throw new Error("Incomplete response");
      console.info(`[ai] source=${provider.source}`);
      return { text, source: provider.source };
    } catch {
      // Do not log API keys, drafts, contacts, or provider response bodies.
      console.warn(`[ai] ${provider.source} unavailable or timed out; trying fallback`);
    } finally {
      clearTimeout(timeout);
    }
  }
  console.info("[ai] source=stub");
  return null;
}
