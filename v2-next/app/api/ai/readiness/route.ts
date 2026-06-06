import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthedUser, aiErrorResponse } from "@/lib/ai/auth";
import { predictReadiness } from "@/lib/ai/engine";

export const runtime = "nodejs";

const schema = z.object({
  targetRole: z.string().min(2).optional()
});

export async function POST(request: Request) {
  const { user, response } = await getAuthedUser();
  if (!user) return response;

  try {
    const input = schema.parse(await request.json());
    const readiness = await predictReadiness(user.id, input.targetRole);
    return NextResponse.json({ readiness });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
