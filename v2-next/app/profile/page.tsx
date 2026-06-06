import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { updateProfile } from "./actions";
import { Button } from "@/components/ui/button";

export default async function ProfilePage() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  return (
    <main className="min-h-screen px-5 py-8 md:px-8">
      <section className="glass mx-auto max-w-4xl rounded-[2rem] p-6 md:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-lime">Profile</p>
        <h1 className="mt-4 font-display text-5xl font-bold">Student identity.</h1>
        <form action={updateProfile} className="mt-8 grid gap-4 md:grid-cols-2">
          <input name="name" defaultValue={profile?.name || user.user_metadata?.name || ""} className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 outline-none" placeholder="Name" required />
          <input name="username" defaultValue={profile?.username || user.user_metadata?.username || ""} className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 outline-none" placeholder="Username" required />
          <input name="college" defaultValue={profile?.college || ""} className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 outline-none" placeholder="College" />
          <input name="branch" defaultValue={profile?.branch || ""} className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 outline-none" placeholder="Branch" />
          <input name="cgpa" defaultValue={profile?.cgpa || ""} className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 outline-none" placeholder="CGPA" />
          <input name="skills" defaultValue={(profile?.skills || []).join(", ")} className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 outline-none" placeholder="Skills comma separated" />
          <input name="linkedin" defaultValue={profile?.linkedin || ""} className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 outline-none" placeholder="LinkedIn" />
          <input name="github" defaultValue={profile?.github || ""} className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 outline-none" placeholder="GitHub" />
          <Button className="md:col-span-2">Save profile</Button>
        </form>
      </section>
    </main>
  );
}
