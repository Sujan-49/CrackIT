import { createServerClient } from "@/lib/supabase/server";
import { getMissionControl } from "@/lib/placement/mission-control";
import { MissionControl } from "@/components/mission-control";

export default async function DashboardPage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const model = user ? await getMissionControl(user.id) : null;

  return (
    <main className="min-h-screen px-5 py-6 md:px-8">
      <MissionControl model={model} />
    </main>
  );
}
