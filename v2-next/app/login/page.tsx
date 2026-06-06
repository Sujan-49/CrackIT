"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function continueWithGoogle() {
    setLoading(true);
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (error) {
      setMessage(error.message);
      setLoading(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const supabase = createBrowserSupabase();

    const response = mode === "login"
      ? await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
      : await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: {
              name: form.name,
              username: form.username
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        });

    if (response.error) {
      setMessage(response.error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <section className="glass w-full max-w-xl rounded-[2rem] p-6 md:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-lime">CrackIT Auth</p>
        <h1 className="mt-4 font-display text-5xl font-bold">{mode === "login" ? "Welcome back." : "Create account."}</h1>
        <p className="mt-3 text-white/55">Persistent sessions are handled by Supabase Auth cookies.</p>

        {message && <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100">{message}</div>}

        <form onSubmit={submit} className="mt-6 grid gap-4">
          {mode === "signup" && (
            <>
              <input className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 outline-none" placeholder="Full name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
              <input className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 outline-none" placeholder="Unique username" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} required />
            </>
          )}
          <input className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 outline-none" type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
          <input className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 outline-none" type="password" placeholder="Password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
          <Button disabled={loading}>{loading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}</Button>
        </form>

        <Button variant="secondary" className="mt-3 w-full" onClick={continueWithGoogle} disabled={loading}>
          Continue with Google
        </Button>
        <button className="mt-5 text-sm text-white/55" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "Need an account? Create one" : "Already have an account? Login"}
        </button>
      </section>
    </main>
  );
}
