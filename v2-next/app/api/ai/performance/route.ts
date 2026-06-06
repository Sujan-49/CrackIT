import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getMissionControl } from "@/lib/placement/mission-control";

export async function GET() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const report = await getMissionControl(user.id);
  return NextResponse.json({ report });
}
