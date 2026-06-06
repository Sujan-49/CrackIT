import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthedUser, aiErrorResponse } from "@/lib/ai/auth";
import { analyzeResume } from "@/lib/ai/engine";

export const runtime = "nodejs";

const schema = z.object({
  resumeText: z.string().min(200),
  targetRole: z.string().min(2).optional()
});

export async function POST(request: Request) {
  const { user, response } = await getAuthedUser();
  if (!user) return response;

  try {
    const input = schema.parse(await request.json());
    const report = await analyzeResume(user.id, input.resumeText, input.targetRole);
    return NextResponse.json(report);
  } catch (error) {
    return aiErrorResponse(error);
  }
}
