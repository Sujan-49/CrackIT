import { NextResponse } from "next/server";
import { getAuthedUser, aiErrorResponse } from "@/lib/ai/auth";
import { detectWeakTopics } from "@/lib/ai/engine";

export const runtime = "nodejs";

export async function GET() {
  const { user, response } = await getAuthedUser();
  if (!user) return response;

  try {
    const result = await detectWeakTopics(user.id);
    return NextResponse.json(result);
  } catch (error) {
    return aiErrorResponse(error);
  }
}
