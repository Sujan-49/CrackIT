import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export function hashPayload(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export async function getCachedAi<T>(reportType: string, payload: unknown) {
  const supabase = createAdminClient();
  const cacheKey = `${reportType}:${hashPayload(payload)}`;
  const { data } = await supabase
    .from("ai_cache")
    .select("payload,expires_at")
    .eq("cache_key", cacheKey)
    .maybeSingle();

  if (!data) return null;
  if (new Date(data.expires_at).getTime() <= Date.now()) return null;
  return { cacheKey, payload: data.payload as T };
}

export async function setCachedAi(reportType: string, input: unknown, payload: unknown) {
  const supabase = createAdminClient();
  const ttlHours = Number(process.env.AI_CACHE_TTL_HOURS || 24);
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
  const cacheKey = `${reportType}:${hashPayload(input)}`;

  await supabase.from("ai_cache").upsert({
    cache_key: cacheKey,
    report_type: reportType,
    payload,
    expires_at: expiresAt
  });

  return cacheKey;
}

export function normalizeQuestionSignature(question: {
  question?: string;
  options?: string[];
  correctAnswer?: string;
  correct_answer?: string;
}) {
  const clean = (value: string | undefined) => (value || "").toLowerCase().replace(/\s+/g, " ").trim();
  const options = Array.isArray(question.options) ? question.options.map(clean).sort().join("|") : "";
  return hashPayload({
    question: clean(question.question),
    options,
    answer: clean(question.correctAnswer || question.correct_answer)
  });
}
