import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthedUser, aiErrorResponse } from "@/lib/ai/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const schema = z.object({
  questionHash: z.string().min(16),
  selectedAnswer: z.string().min(1),
  timeTaken: z.number().int().min(0).optional()
});

export async function POST(request: Request) {
  const { user, response } = await getAuthedUser();
  if (!user) return response;

  try {
    const input = schema.parse(await request.json());
    const supabase = createAdminClient();
    const { data: quizItem, error } = await supabase
      .from("quiz_history")
      .select("id,domain,topic,difficulty,correct_answer")
      .eq("user_id", user.id)
      .eq("question_hash", input.questionHash)
      .maybeSingle();

    if (error || !quizItem) {
      return NextResponse.json({ error: "Quiz question was not found for this user." }, { status: 404 });
    }

    const isCorrect = input.selectedAnswer === quizItem.correct_answer;
    const score = isCorrect ? 1 : 0;

    await Promise.all([
      supabase
        .from("quiz_history")
        .update({
          selected_answer: input.selectedAnswer,
          score,
          time_taken: input.timeTaken || null,
          attempted_at: new Date().toISOString()
        })
        .eq("id", quizItem.id),
      supabase.from("mcq_results").insert({
        user_id: user.id,
        domain: quizItem.domain,
        topic: quizItem.topic,
        selected_answer: input.selectedAnswer,
        correct_answer: quizItem.correct_answer,
        score,
        total: 1,
        time_taken: input.timeTaken || null
      }),
      supabase.from("user_progress").upsert({
        user_id: user.id,
        content_type: "ai_quiz",
        content_id: input.questionHash,
        domain: quizItem.domain,
        topic: quizItem.topic,
        difficulty: quizItem.difficulty,
        status: isCorrect ? "completed" : "viewed",
        score,
        time_taken: input.timeTaken || null,
        metadata: { selectedAnswer: input.selectedAnswer, correctAnswer: quizItem.correct_answer }
      })
    ]);

    return NextResponse.json({
      correct: isCorrect,
      score,
      correctAnswer: quizItem.correct_answer
    });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
