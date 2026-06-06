import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthedUser, aiErrorResponse } from "@/lib/ai/auth";
import { generateQuiz } from "@/lib/ai/engine";

export const runtime = "nodejs";

const schema = z.object({
  domain: z.string().min(2),
  topic: z.string().optional(),
  company: z.string().optional(),
  easy: z.number().int().min(0).max(10).optional(),
  medium: z.number().int().min(0).max(10).optional(),
  hard: z.number().int().min(0).max(10).optional()
});

export async function POST(request: Request) {
  const { user, response } = await getAuthedUser();
  if (!user) return response;

  try {
    const input = schema.parse(await request.json());
    const quiz = await generateQuiz(user.id, input);
    return NextResponse.json(quiz);
  } catch (error) {
    return aiErrorResponse(error);
  }
}
