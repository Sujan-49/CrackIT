type MissionModel = {
  readinessScore: number;
  dsaProgress: number;
  mcqAccuracy: number;
  streak: number;
  weakAreas: string[];
  strongAreas: string[];
  recentActivity: string[];
} | null;

export function MissionControl({ model }: { model: MissionModel }) {
  const stats = [
    ["Readiness", `${model?.readinessScore ?? 0}%`],
    ["DSA Progress", `${model?.dsaProgress ?? 0}%`],
    ["MCQ Accuracy", `${model?.mcqAccuracy ?? 0}%`],
    ["Streak", `${model?.streak ?? 0}d`]
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <section className="glass rounded-[2rem] p-6 md:p-10">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-lime">Mission Control</p>
        <h1 className="mt-4 font-display text-5xl font-bold md:text-7xl">Placement readiness, not vanity stats.</h1>
        {!model && <p className="mt-5 text-white/55">Login to load your real Supabase profile, progress, bookmarks, MCQ results, and AI recommendations.</p>}
      </section>
      <section className="mt-5 grid gap-4 md:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="glass rounded-3xl p-6">
            <p className="text-sm text-white/45">{label}</p>
            <strong className="mt-3 block font-display text-4xl">{value}</strong>
          </div>
        ))}
      </section>
      <section className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-3xl p-6">
          <h2 className="text-2xl font-bold">Strong Areas</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {(model?.strongAreas?.length ? model.strongAreas : ["No data yet"]).map((item) => <span key={item} className="rounded-full bg-lime/10 px-3 py-2 text-lime">{item}</span>)}
          </div>
        </div>
        <div className="glass rounded-3xl p-6">
          <h2 className="text-2xl font-bold">Weak Areas</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {(model?.weakAreas?.length ? model.weakAreas : ["Attempt quizzes to unlock weak areas"]).map((item) => <span key={item} className="rounded-full bg-white/10 px-3 py-2 text-white/70">{item}</span>)}
          </div>
        </div>
      </section>
    </div>
  );
}
