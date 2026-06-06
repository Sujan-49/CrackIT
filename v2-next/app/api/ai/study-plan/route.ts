import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthedUser, aiErrorResponse } from "@/lib/ai/auth";
import { createStudyPlan } from "@/lib/ai/engine";

export const runtime = "nodejs";

const schema = z.object({
  goal: z.string().min(2).optional()
});

export async function POST(request: Request) {
  const { user, response } = await getAuthedUser();
  if (!user) return response;

  try {
    const input = schema.parse(await request.json());
    const plan = await createStudyPlan(user.id, input.goal);
    return NextResponse.json(plan);
  } catch (error) {
    return aiErrorResponse(error);
  }
}
