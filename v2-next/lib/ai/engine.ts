import { createAdminClient } from "@/lib/supabase/admin";
import { getCachedAi, normalizeQuestionSignature, setCachedAi } from "@/lib/ai/cache";
import { calculateWeakTopics, getPlacementContext } from "@/lib/ai/context";
import { generateJson } from "@/lib/ai/ollama";

type QuizQuestion = {
  title: string;
  domain: string;
  topic: string;
  difficulty: "Easy" | "Medium" | "Hard";
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: {
    correct: string;
    incorrect: Record<string, string>;
  };
  tags: string[];
};

type QuizRequest = {
  domain: string;
  topic?: string;
  company?: string;
  easy?: number;
  medium?: number;
  hard?: number;
};

async function storeAiReport(userId: string, reportType: string, payload: unknown) {
  const supabase = createAdminClient();
  await supabase.from("ai_reports").insert({
    user_id: userId,
    report_type: reportType,
    payload
  });
}

async function getKnownQuestionHashes(userId: string) {
  const supabase = createAdminClient();
  const [{ data: history }, { data: mcqs }] = await Promise.all([
    supabase.from("quiz_history").select("question_hash").eq("user_id", userId),
    supabase.from("mcqs").select("question,options,correct_answer").limit(5000)
  ]);

  return new Set([
    ...(history || []).map((item) => item.question_hash),
    ...(mcqs || []).map((item) =>
      normalizeQuestionSignature({
        question: item.question,
        options: Array.isArray(item.options) ? item.options : [],
        correct_answer: item.correct_answer
      })
    )
  ]);
}

function uniqueQuizQuestions(questions: QuizQuestion[], knownHashes: Set<string>) {
  const selected: Array<QuizQuestion & { questionHash: string }> = [];
  const seen = new Set<string>();

  for (const question of questions) {
    const hash = normalizeQuestionSignature(question);
    const hasFourOptions = Array.isArray(question.options) && question.options.length === 4;
    const hasAnswer = hasFourOptions && question.options.includes(question.correctAnswer);
    if (!question.question || !hasFourOptions || !hasAnswer) continue;
    if (knownHashes.has(hash) || seen.has(hash)) continue;
    seen.add(hash);
    selected.push({ ...question, questionHash: hash });
  }

  return selected;
}

export async function generateQuiz(userId: string, request: QuizRequest) {
  const counts = {
    Easy: Math.max(0, request.easy ?? 2),
    Medium: Math.max(0, request.medium ?? 3),
    Hard: Math.max(0, request.hard ?? 3)
  };
  const total = counts.Easy + counts.Medium + counts.Hard;
  const context = await getPlacementContext(userId);
  const weakTopics = calculateWeakTopics(context).slice(0, 6);
  const knownHashes = await getKnownQuestionHashes(userId);
  const cacheInput = { userId, request, weakTopics, avoidedCount: knownHashes.size };

  const cached = await getCachedAi<{ questions: QuizQuestion[] }>("quiz_generation", cacheInput);
  let generated = cached?.payload;

  if (!generated) {
    generated = await generateJson<{ questions: QuizQuestion[] }>(
      `You are CrackIT's placement mentor and exam-quality quiz generator.
Generate exactly ${total} unique interview-level MCQs for ${request.domain}.
Difficulty distribution must be Easy=${counts.Easy}, Medium=${counts.Medium}, Hard=${counts.Hard}.
Every question must be practical, non-placeholder, and topic-specific.
Do not use generic wording like "key characteristic #1".
Each question must include 4 options, correctAnswer copied exactly from one option, and an explanation with:
- correct: why the answer is correct
- incorrect: why each other option is wrong
JSON schema: {"questions":[{"title":"","domain":"","topic":"","difficulty":"Easy|Medium|Hard","question":"","options":["","","",""],"correctAnswer":"","explanation":{"correct":"","incorrect":{"option text":"reason"}},"tags":[""]}]}`,
      { request, userContext: context, weakTopics, doNotRepeatHashes: [...knownHashes].slice(0, 300) },
      { temperature: 0.45 }
    );
    await setCachedAi("quiz_generation", cacheInput, generated);
  }

  const selected = uniqueQuizQuestions(generated.questions || [], knownHashes).slice(0, total);
  if (selected.length < total) {
    throw new Error(`Ollama generated only ${selected.length} unique valid questions. Requested ${total}. Retry or narrow the topic.`);
  }

  const supabase = createAdminClient();
  await supabase.from("quiz_history").insert(
    selected.map((question) => ({
      user_id: userId,
      source: "ai",
      domain: question.domain || request.domain,
      topic: question.topic || request.topic || null,
      difficulty: question.difficulty,
      question_hash: question.questionHash,
      question,
      correct_answer: question.correctAnswer
    }))
  );

  const payload = { questions: selected, cached: Boolean(cached) };
  await storeAiReport(userId, "quiz_generation", payload);
  return payload;
}

export async function explainMcq(userId: string, mcqId: string, selectedAnswer?: string) {
  const supabase = createAdminClient();
  const { data: mcq, error } = await supabase.from("mcqs").select("*").eq("id", mcqId).maybeSingle();
  if (error || !mcq) throw new Error("MCQ not found.");

  const context = await getPlacementContext(userId);
  const cacheInput = { mcqId, selectedAnswer, userWeakAreas: context.mission.weakAreas };
  const cached = await getCachedAi("mcq_explanation", cacheInput);
  if (cached) return { explanation: cached.payload, cached: true };

  const explanation = await generateJson(
    `Explain this MCQ like a senior interviewer.
Return JSON: {"shortAnswer":"","whyCorrect":"","whySelectedIsWrong":"","optionReview":[{"option":"","review":""}],"revisionTip":"","relatedTopics":[""]}`,
    { mcq, selectedAnswer, userContext: context },
    { temperature: 0.25 }
  );
  await setCachedAi("mcq_explanation", cacheInput, explanation);
  await storeAiReport(userId, "mcq_explanation", { mcqId, selectedAnswer, explanation });
  return { explanation, cached: false };
}

export async function analyzeResume(userId: string, resumeText: string, targetRole = "Software Engineer") {
  if (resumeText.trim().length < 200) throw new Error("Resume text is too short to analyze.");
  const context = await getPlacementContext(userId);
  const cacheInput = { userId, resumeTextHash: resumeText.slice(0, 8000), targetRole, context: context.mission };
  type ResumeAnalysis = {
    atsScore: number;
    missingKeywords: string[];
    skillsFound: string[];
    projectFeedback: unknown[];
    improvements: unknown[];
    interviewReadiness: string;
  };
  const cached = await getCachedAi<ResumeAnalysis>("resume_analysis", cacheInput);
  const analysis =
    cached?.payload ||
    (await generateJson<ResumeAnalysis>(
      `You are an ATS resume reviewer for Indian placement and product-company hiring.
Return JSON only with atsScore 0-100, missingKeywords, skillsFound, projectFeedback, improvements, interviewReadiness.
Be specific and do not invent experience that is not in the resume.`,
      { resumeText, targetRole, userContext: context },
      { temperature: 0.25 }
    ));

  if (!cached) await setCachedAi("resume_analysis", cacheInput, analysis);

  const supabase = createAdminClient();
  await supabase.from("resume_reports").insert({
    user_id: userId,
    ats_score: Math.max(0, Math.min(100, Number(analysis.atsScore || 0))),
    missing_keywords: analysis.missingKeywords || [],
    improvements: analysis.improvements || [],
    resume_text: resumeText,
    target_role: targetRole,
    skills_found: analysis.skillsFound || [],
    project_feedback: analysis.projectFeedback || [],
    raw_report: analysis
  });
  await storeAiReport(userId, "resume_analysis", analysis);
  return { analysis, cached: Boolean(cached) };
}

export async function createStudyPlan(userId: string, goal = "Placement Preparation") {
  const context = await getPlacementContext(userId);
  const weakTopics = calculateWeakTopics(context).slice(0, 8);
  const cacheInput = { userId, goal, weakTopics, mission: context.mission };
  const cached = await getCachedAi("study_plan", cacheInput);
  const plan =
    cached?.payload ||
    (await generateJson(
      `Create a realistic 7-day placement study plan.
Return JSON: {"goal":"","days":[{"day":"","focus":"","tasks":[""],"practiceTargets":[""],"estimatedMinutes":0}],"successMetric":"","adjustmentRule":""}`,
      { goal, context, weakTopics },
      { temperature: 0.35 }
    ));

  if (!cached) await setCachedAi("study_plan", cacheInput, plan);
  const supabase = createAdminClient();
  await supabase.from("study_plans").insert({ user_id: userId, goal, plan });
  await storeAiReport(userId, "study_plan", plan);
  return { plan, cached: Boolean(cached) };
}

export async function predictReadiness(userId: string, targetRole = "Software Engineer") {
  const context = await getPlacementContext(userId);
  const weakTopics = calculateWeakTopics(context).slice(0, 8);
  const prediction = await generateJson<{
    overallScore: number;
    companies: Array<{ company: string; readiness: number; missingSkills: string[] }>;
    missingSkills: string[];
    recommendations: unknown[];
    evidence: unknown;
  }>(
    `Predict placement readiness using only the user's stored progress.
Return JSON: {"overallScore":0,"companies":[{"company":"","readiness":0,"missingSkills":[""]}],"missingSkills":[""],"recommendations":[],"evidence":{}}`,
    { targetRole, context, weakTopics },
    { temperature: 0.2 }
  );

  const supabase = createAdminClient();
  await supabase.from("readiness_scores").insert({
    user_id: userId,
    target_role: targetRole,
    score: Math.max(0, Math.min(100, Number(prediction.overallScore || 0))),
    missing_skills: prediction.missingSkills || [],
    recommendations: prediction.recommendations || [],
    evidence: prediction.evidence || {}
  });
  await storeAiReport(userId, "readiness_prediction", prediction);
  return prediction;
}

export async function generateRoadmap(userId: string, goal: string) {
  const context = await getPlacementContext(userId);
  const roadmap = await generateJson(
    `Generate a personalized role roadmap.
Return JSON: {"goal":"","currentLevel":"","steps":[{"title":"","status":"start|continue|locked","why":"","tasks":[""],"proofOfWork":""}],"recommendedProjects":[""],"interviewFocus":[""]}`,
    { goal, context, weakTopics: calculateWeakTopics(context).slice(0, 8) },
    { temperature: 0.35 }
  );
  await storeAiReport(userId, "roadmap_generation", roadmap);
  return roadmap;
}

export async function detectWeakTopics(userId: string) {
  const context = await getPlacementContext(userId);
  const weakTopics = calculateWeakTopics(context);
  const payload = {
    weakTopics: weakTopics.slice(0, 10),
    strongTopics: context.mission.strongAreas,
    recommendationBasis: "Derived from stored MCQ score, attempts, and time per topic."
  };
  await storeAiReport(userId, "weak_topic_detection", payload);
  return payload;
}

export async function recommendLearning(userId: string) {
  const context = await getPlacementContext(userId);
  const weakTopics = calculateWeakTopics(context).slice(0, 8);
  const recommendations = await generateJson(
    `Recommend the next learning actions.
Return JSON: {"priorityActions":[{"title":"","reason":"","resourceType":"DSA|MCQ|Project|Note|Roadmap","topic":"","difficulty":""}],"avoidForNow":[""],"nextCheckpoint":""}`,
    { context, weakTopics },
    { temperature: 0.35 }
  );
  await storeAiReport(userId, "learning_recommendations", recommendations);
  return recommendations;
}

export async function weeklyReport(userId: string) {
  const context = await getPlacementContext(userId);
  const report = await generateJson(
    `Create a weekly placement performance report.
Return JSON: {"summary":"","questionsSolved":0,"accuracy":0,"bestTopic":"","worstTopic":"","growthPercent":0,"studyHours":0,"actionPlan":[""],"riskFlags":[""]}`,
    { context, weakTopics: calculateWeakTopics(context).slice(0, 8) },
    { temperature: 0.3 }
  );
  await storeAiReport(userId, "weekly_report", report);
  return report;
}
