import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const domain = url.searchParams.get("domain");
  const difficulty = url.searchParams.get("difficulty");
  const topic = url.searchParams.get("topic");
  const limit = Math.min(20, Math.max(1, Number(url.searchParams.get("limit") || 8)));

  let query = supabase.from("mcqs").select("id,title,domain,topic,difficulty,question,options,explanation,tags").limit(limit);
  if (domain) query = query.eq("domain", domain);
  if (difficulty) query = query.eq("difficulty", difficulty);
  if (topic) query = query.eq("topic", topic);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ quiz: { questions: data || [] } });
}
