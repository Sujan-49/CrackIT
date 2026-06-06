import { createAdminClient } from "@/lib/supabase/admin";
import { getMissionControl } from "@/lib/placement/mission-control";

export async function getPlacementContext(userId: string) {
  const supabase = createAdminClient();
  const [mission, profileResult, progressResult, quizHistoryResult, mcqResult, resumeResult] = await Promise.all([
    getMissionControl(userId),
    supabase.from("profiles").select("name,username,college,branch,cgpa,skills,current_streak,longest_streak").eq("id", userId).maybeSingle(),
    supabase.from("progress").select("status,topic,difficulty,updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(100),
    supabase.from("quiz_history").select("domain,topic,difficulty,question_hash,score,time_taken,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
    supabase.from("mcq_results").select("domain,topic,score,total,time_taken,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
    supabase.from("resume_reports").select("ats_score,missing_keywords,skills_found,target_role,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(3)
  ]);

  return {
    userId,
    profile: profileResult.data || null,
    mission,
    progress: progressResult.data || [],
    quizHistory: quizHistoryResult.data || [],
    mcqResults: mcqResult.data || [],
    resumeReports: resumeResult.data || []
  };
}

export function calculateWeakTopics(context: Awaited<ReturnType<typeof getPlacementContext>>) {
  const topicStats = new Map<string, { score: number; total: number; time: number; attempts: number }>();
  for (const result of context.mcqResults) {
    const topic = result.topic || result.domain || "General";
    const item = topicStats.get(topic) || { score: 0, total: 0, time: 0, attempts: 0 };
    item.score += Number(result.score || 0);
    item.total += Number(result.total || 0);
    item.time += Number(result.time_taken || 0);
    item.attempts += 1;
    topicStats.set(topic, item);
  }

  return [...topicStats.entries()]
    .map(([topic, item]) => ({
      topic,
      accuracy: item.total ? Math.round((item.score / item.total) * 100) : 0,
      attempts: item.attempts,
      averageTime: item.attempts ? Math.round(item.time / item.attempts) : 0
    }))
    .filter((item) => item.attempts >= 1)
    .sort((a, b) => a.accuracy - b.accuracy || b.averageTime - a.averageTime);
}
