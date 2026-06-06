import Link from "next/link";
import { ArrowUpRight, Instagram } from "lucide-react";

const instagramUrl = "https://www.instagram.com/sjdevs.io/?__pwa=1";

export default function HomePage() {
  return (
    <main className="min-h-screen px-5 py-5 text-white md:px-8">
      <section className="hero-grid relative min-h-[calc(100vh-2.5rem)] overflow-hidden rounded-[2rem] border border-white/10 bg-black">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(163,255,18,0.20),transparent_28rem),linear-gradient(to_top,rgba(0,0,0,0.82),transparent)]" />
        <nav className="absolute left-1/2 top-0 z-10 flex -translate-x-1/2 gap-6 rounded-b-3xl bg-black/90 px-8 py-3 text-sm text-white/70 backdrop-blur">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/dsa">DSA</Link>
          <Link href="/mcq">MCQ</Link>
          <Link href="/companies">Companies</Link>
          <a href={instagramUrl} target="_blank" rel="noreferrer">Instagram</a>
        </nav>
        <div className="relative z-10 grid min-h-[calc(100vh-2.5rem)] content-end gap-8 p-6 md:p-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.24em] text-lime">Built by SJ DEVS</p>
            <h1 className="font-display text-[clamp(4.5rem,14vw,13rem)] font-bold leading-[0.78] tracking-normal">
              Become
              <span className="block text-white/50 italic">Irreplaceable.</span>
            </h1>
          </div>
          <div className="max-w-xl self-end pb-5">
            <p className="text-lg leading-8 text-white/62">
              CrackIT is free and open source for students. Learn, practice, build projects, and prepare for placements without payment or forced signup.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-full bg-lime px-5 py-3 font-bold text-black">
                Continue to CrackIT <ArrowUpRight size={18} />
              </Link>
              <a href={instagramUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-white/75">
                <Instagram size={18} /> Follow on Instagram
              </a>
            </div>
            <p className="mt-4 text-sm text-white/38">Following is optional. Students can always continue without following.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
