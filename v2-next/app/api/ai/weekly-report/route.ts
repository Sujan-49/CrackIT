import { NextResponse } from "next/server";
import { getAuthedUser, aiErrorResponse } from "@/lib/ai/auth";
import { weeklyReport } from "@/lib/ai/engine";

export const runtime = "nodejs";

export async function POST() {
  const { user, response } = await getAuthedUser();
  if (!user) return response;

  try {
    const report = await weeklyReport(user.id);
    return NextResponse.json({ report });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
