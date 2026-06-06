import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthedUser, aiErrorResponse } from "@/lib/ai/auth";
import { explainMcq } from "@/lib/ai/engine";

export const runtime = "nodejs";

const schema = z.object({
  mcqId: z.string().min(1),
  selectedAnswer: z.string().optional()
});

export async function POST(request: Request) {
  const { user, response } = await getAuthedUser();
  if (!user) return response;

  try {
    const input = schema.parse(await request.json());
    const result = await explainMcq(user.id, input.mcqId, input.selectedAnswer);
    return NextResponse.json(result);
  } catch (error) {
    return aiErrorResponse(error);
  }
}
