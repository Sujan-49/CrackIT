"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const skills = String(formData.get("skills") || "")
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email,
    name: String(formData.get("name") || ""),
    username: String(formData.get("username") || ""),
    college: String(formData.get("college") || ""),
    branch: String(formData.get("branch") || ""),
    cgpa: formData.get("cgpa") ? Number(formData.get("cgpa")) : null,
    skills,
    linkedin: String(formData.get("linkedin") || ""),
    github: String(formData.get("github") || ""),
    updated_at: new Date().toISOString()
  }, { onConflict: "id" });

  if (error) throw new Error(error.message);
  revalidatePath("/profile");
  revalidatePath("/dashboard");
}
