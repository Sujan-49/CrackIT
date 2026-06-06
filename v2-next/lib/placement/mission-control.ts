import { createAdminClient } from "@/lib/supabase/admin";

export async function getMissionControl(userId: string) {
  const supabase = createAdminClient();
  const [{ data: progress }, { data: results }, { data: profile }] = await Promise.all([
    supabase.from("progress").select("status, topic, difficulty").eq("user_id", userId),
    supabase.from("mcq_results").select("score,total,domain,topic,time_taken,created_at").eq("user_id", userId),
    supabase.from("profiles").select("current_streak").eq("id", userId).single()
  ]);

  const solved = (progress || []).filter((item) => item.status === "solved");
  const totalAttempts = (results || []).reduce((sum, item) => sum + Number(item.total || 0), 0);
  const totalScore = (results || []).reduce((sum, item) => sum + Number(item.score || 0), 0);
  const mcqAccuracy = totalAttempts ? Math.round((totalScore / totalAttempts) * 100) : 0;
  const dsaProgress = Math.min(100, Math.round((solved.length / 225) * 100));

  const topicStats = new Map<string, { total: number; score: number }>();
  for (const result of results || []) {
    const key = result.topic || result.domain || "General";
    const current = topicStats.get(key) || { total: 0, score: 0 };
    current.total += Number(result.total || 0);
    current.score += Number(result.score || 0);
    topicStats.set(key, current);
  }
  const ranked = [...topicStats.entries()].map(([topic, item]) => ({
    topic,
    accuracy: item.total ? Math.round((item.score / item.total) * 100) : 0
  }));

  return {
    readinessScore: Math.min(100, Math.round(dsaProgress * 0.45 + mcqAccuracy * 0.45 + Math.min(10, solved.length / 10))),
    dsaProgress,
    mcqAccuracy,
    streak: profile?.current_streak || 0,
    strongAreas: ranked.filter((item) => item.accuracy >= 80).map((item) => item.topic).slice(0, 5),
    weakAreas: ranked.filter((item) => item.accuracy < 60).map((item) => item.topic).slice(0, 5),
    recentActivity: (results || []).slice(-5).map((item) => `${item.topic || item.domain}: ${item.score}/${item.total}`)
  };
}
