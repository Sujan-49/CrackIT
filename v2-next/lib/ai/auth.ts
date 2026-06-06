import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function getAuthedUser() {
  const supabase = createServerClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { user, response: null };
}

export function aiErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "AI request failed.";
  const isOllamaIssue =
    message.toLowerCase().includes("ollama") ||
    message.toLowerCase().includes("model") ||
    message.toLowerCase().includes("timed out") ||
    message.toLowerCase().includes("fetch failed");

  return NextResponse.json(
    {
      error: message,
      hint: isOllamaIssue
        ? "Start Ollama locally and run: ollama pull gemma3. Then set OLLAMA_BASE_URL and OLLAMA_MODEL in .env.local."
        : undefined
    },
    { status: isOllamaIssue ? 503 : 400 }
  );
}
