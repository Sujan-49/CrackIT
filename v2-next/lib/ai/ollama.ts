type OllamaOptions = {
  temperature?: number;
  timeoutMs?: number;
};

export class OllamaUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OllamaUnavailableError";
  }
}

function getOllamaConfig() {
  return {
    baseUrl: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
    model: process.env.OLLAMA_MODEL || "gemma3"
  };
}

function extractJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return trimmed;
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const firstObject = trimmed.indexOf("{");
  const lastObject = trimmed.lastIndexOf("}");
  if (firstObject >= 0 && lastObject > firstObject) return trimmed.slice(firstObject, lastObject + 1);
  const firstArray = trimmed.indexOf("[");
  const lastArray = trimmed.lastIndexOf("]");
  if (firstArray >= 0 && lastArray > firstArray) return trimmed.slice(firstArray, lastArray + 1);
  return trimmed;
}

export async function callOllama(prompt: string, options: OllamaOptions = {}) {
  const { baseUrl, model } = getOllamaConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 90_000);

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature: options.temperature ?? 0.35
        }
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new OllamaUnavailableError(`Ollama returned HTTP ${response.status}. Confirm Ollama is running and model "${model}" is pulled.`);
    }

    const data = (await response.json()) as { response?: string; error?: string };
    if (data.error) throw new OllamaUnavailableError(data.error);
    if (!data.response) throw new OllamaUnavailableError("Ollama returned an empty response.");
    return data.response;
  } catch (error) {
    if (error instanceof OllamaUnavailableError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new OllamaUnavailableError("Ollama request timed out. Keep Ollama running locally and try a smaller request.");
    }
    throw new OllamaUnavailableError(error instanceof Error ? error.message : "Unable to reach Ollama.");
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateJson<T>(systemInstruction: string, payload: unknown, options: OllamaOptions = {}) {
  const prompt = `${systemInstruction}

Return only valid JSON. Do not include markdown, commentary, or code fences.

INPUT:
${JSON.stringify(payload, null, 2)}`;

  const raw = await callOllama(prompt, options);
  try {
    return JSON.parse(extractJson(raw)) as T;
  } catch {
    throw new OllamaUnavailableError("Ollama did not return valid JSON. Retry with the same request or reduce the scope.");
  }
}
