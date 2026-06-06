import { NextResponse } from "next/server";
import { getAuthedUser, aiErrorResponse } from "@/lib/ai/auth";
import { recommendLearning } from "@/lib/ai/engine";

export const runtime = "nodejs";

export async function GET() {
  const { user, response } = await getAuthedUser();
  if (!user) return response;

  try {
    const recommendations = await recommendLearning(user.id);
    return NextResponse.json({ recommendations });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
