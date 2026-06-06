import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import aiMlMcqs from "../data/datasets/ai_ml_mcq.json";
import cloudMcqs from "../data/datasets/cloud_mcq.json";
import cybersecurityMcqs from "../data/datasets/cybersecurity_mcq.json";
import dbmsMcqs from "../data/datasets/dbms_mcq.json";
import devopsMcqs from "../data/datasets/devops_mcq.json";
import dsaMcqs from "../data/datasets/dsa_mcq.json";
import linuxMcqs from "../data/datasets/linux_mcq.json";
import networkingMcqs from "../data/datasets/networking_mcq.json";
import osMcqs from "../data/datasets/os_mcq.json";
import systemDesignMcqs from "../data/datasets/system_design_mcq.json";
import {
  Bookmark,
  Check,
  Flame,
  Lock,
  LogOut,
  Play,
  Save,
  Settings,
  Trophy,
  User,
  Sparkles,
  ArrowUpRight,
  Instagram,
  Sun,
  Moon,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:4000/api";
const logoUrl = "/pics/logo.png";
const instagramUrl = "https://www.instagram.com/sjdevs.io/?__pwa=1";
const localMcqBank = [
  ...dsaMcqs,
  ...osMcqs,
  ...dbmsMcqs,
  ...networkingMcqs,
  ...linuxMcqs,
  ...cloudMcqs,
  ...devopsMcqs,
  ...aiMlMcqs,
  ...cybersecurityMcqs,
  ...systemDesignMcqs,
];

function shuffleItems(items) {
  return [...items]
    .map((item) => ({ item, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);
}

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();
}

function localMcqMatches(mcq, domain, topic) {
  const haystack = normalizeText([mcq.domain, mcq.topic, ...(mcq.tags || []), ...(mcq.topicTags || [])].join(" "));
  const domainKey = normalizeText(domain);
  const topicKey = normalizeText(topic);
  const domainMatches = domain === "Mixed" || haystack.includes(domainKey);
  const topicMatches = topic === "Mixed" || haystack.includes(topicKey);
  return domainMatches && topicMatches;
}

function buildLocalMcqTest({ domain = "Mixed", topic = "Mixed", count = 6, avoid = [] } = {}) {
  const avoidSet = new Set(avoid);
  let pool = localMcqBank.filter((mcq) => localMcqMatches(mcq, domain, topic));
  if (!pool.length && topic !== "Mixed") pool = localMcqBank.filter((mcq) => localMcqMatches(mcq, domain, "Mixed"));
  if (!pool.length) pool = localMcqBank;
  const freshPool = pool.filter((mcq) => !avoidSet.has(mcq.id));
  const selectedPool = freshPool.length >= Math.min(count, pool.length) ? freshPool : pool;
  return shuffleItems(selectedPool)
    .slice(0, Math.min(count, selectedPool.length))
    .map((mcq) => ({ ...mcq, options: shuffleItems(mcq.options || []) }));
}

function checkLocalMcqTest(mcqs, answers, startedAt) {
  const checked = mcqs.map((mcq) => {
    const selected = answers[mcq.id]?.[0] || "";
    const correctAnswer = mcq.correctAnswer?.[0] || "";
    const correct = selected === correctAnswer;
    return {
      id: mcq.id,
      question: mcq.question,
      selectedAnswer: selected,
      correctAnswer,
      correct,
      explanation: mcq.explanation || `Correct answer: ${correctAnswer}`,
      domain: mcq.domain,
      topic: mcq.topic,
    };
  });
  const result = {
    id: `local-${Date.now()}`,
    score: checked.filter((item) => item.correct).length,
    total: checked.length,
    checked,
    saved: false,
    timeTaken: Math.round((Date.now() - startedAt) / 1000),
    createdAt: new Date().toISOString(),
  };
  const history = JSON.parse(localStorage.getItem("crackit_local_mcq_results") || "[]");
  localStorage.setItem("crackit_local_mcq_results", JSON.stringify([result, ...history].slice(0, 30)));
  return result;
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function api(path, { token, method = "GET", body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: token ? authHeaders(token) : { "Content-Type": "application/json" },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await res.json() : null;
  if (!isJson) {
    const text = await res.text().catch(() => "");
    const looksLikeHtml = text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html");
    const error = new Error(
      looksLikeHtml
        ? `API returned HTML instead of JSON for ${path}. Start the backend on http://127.0.0.1:4000 or fix VITE_API_URL.`
        : `API returned non-JSON response for ${path}.`
    );
    error.status = res.status;
    error.responsePreview = text.slice(0, 180);
    throw error;
  }
  if (!res.ok) {
    const error = new Error(data.error || "Request failed");
    Object.assign(error, data);
    throw error;
  }
  return data;
}

const viewPaths = {
  dashboard: "/",
  dsa: "/dsa",
  mcq: "/mcq",
  careerOs: "/career-os",
  roadmaps: "/roadmaps",
  companies: "/companies",
  leaderboard: "/leaderboard",
  saved: "/saved",
  bookmarks: "/bookmarks",
  profile: "/profile",
  settings: "/settings",
  linux: "/linux",
  os: "/operating-systems",
  dbms: "/dbms",
  projects: "/projects",
  admin: "/admin",
  achievements: "/achievements",
};

function pathToView(pathname) {
  return Object.entries(viewPaths).find(([, path]) => path === pathname)?.[0] || "dashboard";
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

function AppShell() {
  const [token, setToken] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const view = pathToView(location.pathname);
  const setView = (nextView) => navigate(viewPaths[nextView] || "/");
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [supportNotice, setSupportNotice] = useState("");
  const [showWelcome, setShowWelcome] = useState(() => localStorage.getItem("crackit_welcome_seen") !== "true");
  const [theme, setTheme] = useState(() => localStorage.getItem("crackit_theme") || "dark");
  const [exploreOpen, setExploreOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem("crackit_theme", theme);
  }, [theme]);

  async function refresh() {
    if (!token) return;
    setLoading(true);
    try {
      const dashboard = await api("/dashboard", { token });
      setSession(dashboard);
      setError("");
    } catch (err) {
      setError(err.message);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setToken("");
    setSession(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (token) refresh();
  }, [token]);

  function requireLogin(reason = "CrackIT is fully open. If it helps you, follow SJ DEVS on Instagram.", mode = "support") {
    setSupportNotice(reason || "CrackIT is fully open. If it helps you, follow SJ DEVS on Instagram.");
  }

  function continueToCrackIt() {
    localStorage.setItem("crackit_welcome_seen", "true");
    setShowWelcome(false);
  }

  function go(nextView) {
    setView(nextView);
    setExploreOpen(false);
    setMobileNavOpen(false);
  }

  if (showWelcome) return <WelcomeScreen onContinue={continueToCrackIt} />;
  if (loading) return <Splash />;
  const isLoggedIn = false;
  const primaryNav = [
    ["dashboard", "Home"],
    ["dsa", "Questions"],
    ["mcq", "Quizzes"],
  ];
  const exploreNav = [
    ["careerOs", "Career OS"],
    ["roadmaps", "Roadmaps"],
    ["companies", "Companies"],
    ["projects", "Projects"],
    ["linux", "Linux"],
    ["os", "OS"],
    ["dbms", "DBMS"],
    ["leaderboard", "Leaderboard"],
  ].filter(Boolean);

  return (
    <main className="app-shell relative min-h-screen overflow-hidden bg-transparent text-white">
      <div className="ambient-glow pointer-events-none fixed left-[-12rem] top-24 z-0 h-96 w-96 rounded-full bg-[#A3FF12]/10 blur-3xl" />
      <div className="ambient-glow pointer-events-none fixed right-[-10rem] top-8 z-0 h-96 w-96 rounded-full bg-[#66D9EF]/10 blur-3xl" />
      <div className="noise-layer fixed z-0" />
      <header className="app-header sticky top-0 z-40 border-b border-white/[0.08] bg-[#050505]/70 backdrop-blur-2xl">
        <div className="app-header-inner mx-auto flex min-h-20 max-w-[1440px] items-center justify-between gap-3 px-4 py-3 md:px-8">
          <button onClick={() => go("dashboard")} className="brand-button flex min-w-0 items-center gap-3 text-left">
            <img src={logoUrl} alt="SJ DEVS logo" className="h-12 w-36 object-contain" />
            <span className="brand-lockup hidden xl:block">
              <strong>CrackIT by SJ DEVS</strong>
              <small>Free learning platform</small>
            </span>
          </button>
          <nav className="nav-cluster hidden items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.035] p-1 lg:flex">
            {primaryNav.map(([id, label]) => (
              <button
                key={id}
                onClick={() => go(id)}
                className={`magnetic-button rounded-full px-4 py-2 text-sm font-semibold ${view === id ? "neon-ring bg-[#A3FF12] text-black" : "text-white/60 hover:bg-white/[0.08] hover:text-white"}`}
              >
                {label}
              </button>
            ))}
            <div className="relative">
              <button onClick={() => setExploreOpen(!exploreOpen)} className={`magnetic-button inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${exploreNav.some(([id]) => id === view) ? "bg-white/[0.09] text-white" : "text-white/60 hover:bg-white/[0.08] hover:text-white"}`}>
                Explore <ChevronDown size={15} />
              </button>
              {exploreOpen && (
                <div className="nav-popover glass-panel absolute left-1/2 top-full mt-3 grid w-[440px] -translate-x-1/2 grid-cols-2 gap-2 rounded-3xl border border-white/[0.08] bg-[#0E0E0E]/95 p-3 shadow-2xl">
                  {exploreNav.map(([id, label]) => (
                    <button key={id} onClick={() => go(id)} className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold ${view === id ? "bg-[#A3FF12] text-black" : "text-white/68 hover:bg-white/[0.06]"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <a href={instagramUrl} target="_blank" rel="noreferrer" className="magnetic-button inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-white/60 hover:bg-white/[0.08] hover:text-white">
              <Instagram size={16} /> Instagram
            </a>
          </nav>

          <div className="header-actions flex items-center gap-2">
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="theme-toggle magnetic-button inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.05] text-white/70 hover:text-white" title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={() => setMobileNavOpen(!mobileNavOpen)} className="magnetic-button inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.05] text-white/70 lg:hidden" title="Menu">
              {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
              <div className="hidden gap-2 sm:flex">
              <button onClick={() => window.scrollTo({ top: window.innerHeight, behavior: "smooth" })} className="magnetic-button neon-ring rounded-full bg-[#A3FF12] px-5 py-2 text-sm font-semibold text-black">Explore</button>
              </div>
          </div>
        </div>
        {mobileNavOpen && (
          <div className="mobile-nav-panel mx-4 mb-4 rounded-[1.5rem] border border-white/[0.08] bg-[#0E0E0E]/95 p-3 shadow-2xl lg:hidden">
            <div className="grid grid-cols-2 gap-2">
              {[...primaryNav, ...exploreNav].map(([id, label]) => (
                <button key={id} onClick={() => go(id)} className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold ${view === id ? "bg-[#A3FF12] text-black" : "bg-white/[0.045] text-white/70"}`}>
                  {label}
                </button>
              ))}
              <a href={instagramUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl bg-white/[0.045] px-4 py-3 text-sm font-semibold text-white/70">
                <Instagram size={16} /> Instagram
              </a>
            </div>
          </div>
        )}
      </header>

      <div className="app-content relative z-10 mx-auto max-w-[1440px] px-5 py-8 md:px-10">
        <SupportBanner message={supportNotice} onClose={() => setSupportNotice("")} />
        {error && <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-100">{error}</div>}
        <>
            <Routes>
              <Route path="/" element={<GuestHome setView={setView} requireLogin={requireLogin} />} />
              <Route path="/dsa" element={<DsaModule token={token} onChange={() => null} requireLogin={requireLogin} />} />
              <Route path="/content/:id" element={<ContentDetail token={token} requireLogin={requireLogin} />} />
              <Route path="/mcq" element={<McqModule token={token} requireLogin={requireLogin} />} />
              <Route path="/mcq/:id" element={<McqDetail token={token} requireLogin={requireLogin} />} />
              <Route path="/career-os" element={<CareerOS />} />
              <Route path="/copilot" element={<Navigate to="/" replace />} />
              <Route path="/roadmaps" element={<Roadmaps token={token} requireLogin={requireLogin} />} />
              <Route path="/companies" element={<Companies token={token} />} />
              <Route path="/companies/:id" element={<CompanyDetail token={token} />} />
              <Route path="/linux" element={<TopicPage title="Linux" topic="DevOps" category="Infrastructure" token={token} requireLogin={requireLogin} note="The uploaded guide does not contain a dedicated Linux section yet, so this page shows real infrastructure and DevOps records already in the database." />} />
              <Route path="/operating-systems" element={<TechnicalMcqPage title="Operating Systems" topic="Operating Systems" token={token} />} />
              <Route path="/dbms" element={<TechnicalMcqPage title="DBMS" topic="DBMS" token={token} />} />
              <Route path="/projects" element={<ProjectsPage token={token} requireLogin={requireLogin} />} />
              <Route path="/projects/:id" element={<ProjectDetail token={token} />} />
              <Route path="/leaderboard" element={<Leaderboard token={token} />} />
              <Route path="/achievements" element={<OpenAccessNotice title="Practice milestones appear inside DSA and Career OS" />} />
              <Route path="/admin" element={<OpenAccessNotice title="Admin tools are not public" />} />
              <Route path="/saved" element={<OpenAccessNotice title="Saved lists are disabled in open mode" />} />
              <Route path="/bookmarks" element={<OpenAccessNotice title="Bookmarks are disabled in open mode" />} />
              <Route path="/profile" element={<Navigate to="/" replace />} />
              <Route path="/settings" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </>
      </div>
      <ReferenceNotice />
    </main>
  );
}

function WelcomeScreen({ onContinue }) {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#050505] px-5 py-10 text-white">
      <div className="pointer-events-none absolute left-[-12rem] top-[-8rem] h-[30rem] w-[30rem] rounded-full bg-[#A3FF12]/14 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-10rem] right-[-8rem] h-[28rem] w-[28rem] rounded-full bg-[#66D9EF]/10 blur-3xl" />
      <div className="noise-layer fixed z-0" />
      <section className="glass-panel relative z-10 w-full max-w-3xl overflow-hidden rounded-[2.5rem] border border-white/[0.1] bg-[#0E0E0E]/82 p-7 text-center shadow-[0_40px_140px_rgba(0,0,0,0.45)] md:p-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(163,255,18,0.18),transparent_35%)]" />
        <div className="relative">
          <img src={logoUrl} alt="SJ DEVS logo" className="mx-auto h-20 w-64 object-contain" />
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.34em] text-[#A3FF12]">CrackIT by SJ DEVS</p>
          <h1 className="mt-5 font-display text-5xl font-semibold tracking-[-0.06em] md:text-7xl">
            Free for students.
            <span className="block text-white/48">Open for everyone.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-8 text-white/62">
            This platform is free and open source for students. If you find it useful, consider following SJ DEVS on Instagram.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a href={instagramUrl} target="_blank" rel="noreferrer" className="magnetic-button inline-flex items-center justify-center gap-2 rounded-full border border-[#A3FF12]/30 bg-[#A3FF12]/10 px-6 py-3 font-semibold text-[#A3FF12]">
              <Instagram size={18} /> Follow on Instagram
            </a>
            <button onClick={onContinue} className="magnetic-button neon-ring rounded-full bg-[#A3FF12] px-6 py-3 font-semibold text-black">
              Continue to CrackIT
            </button>
          </div>
          <p className="mt-5 text-sm text-white/38">Following is optional. You can always continue without following.</p>
        </div>
      </section>
    </main>
  );
}

function SupportBanner({ message, onClose }) {
  return (
    <div className="support-banner mb-5 rounded-[1.5rem] border border-[#A3FF12]/20 bg-[#A3FF12]/10 p-4 text-sm text-white/70">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p>
          {message || "CrackIT by SJ DEVS is free and open source. Content is updated continuously; follow SJ DEVS for updates and new resources."}
        </p>
        <div className="flex flex-wrap gap-2">
          <a href={instagramUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#A3FF12] px-4 py-2 font-semibold text-black">
            <Instagram size={15} /> Follow
          </a>
          {message && <button onClick={onClose} className="rounded-full border border-white/[0.12] px-4 py-2 text-white/65">Continue</button>}
        </div>
      </div>
    </div>
  );
}

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "Sujan", username: "sujankumar", email: "sujan@example.com", password: "password123" });
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    try {
      const data = await api(mode === "login" ? "/auth/login" : "/auth/register", {
        method: "POST",
        body: form,
      });
      onLogin(data.token);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="min-h-screen bg-[#050505] px-5 py-6 text-white md:px-10">
      <header className="mx-auto flex max-w-[1200px] items-center justify-between">
        <img src={logoUrl} alt="SJ DEVS logo" className="h-14 w-44 object-contain" />
        <div className="flex gap-2">
          <button onClick={() => setMode("login")} className="rounded-full border border-white/[0.1] px-5 py-2 text-sm text-white/70">Login</button>
          <button onClick={() => setMode("register")} className="rounded-full bg-[#A3FF12] px-5 py-2 text-sm font-semibold text-black">Get Started</button>
        </div>
      </header>
      <div className="mx-auto grid min-h-[calc(100vh-7rem)] max-w-[1200px] items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section>
          <p className="mt-10 text-sm font-medium uppercase tracking-[0.35em] text-[#A3FF12]">
            Real auth. Real progress. Real platform.
          </p>
          <h1 className="mt-6 text-[clamp(4rem,11vw,9rem)] font-semibold leading-[0.82] tracking-[-0.07em]">
            CrackIT
            <br />
            <span className="text-white/45">Actually Works.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-white/55">
            Login, solve questions, bookmark, write notes, take MCQ tests, save roadmap progress, and see the leaderboard.
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/38">
            Local MVP auth uses email/password with JWT. Google OAuth is a production requirement and should be wired with free Google OAuth credentials before deployment.
          </p>
        </section>
        <Panel>
          <div className="mb-6 flex gap-2">
            <button onClick={() => setMode("login")} className={`rounded-full px-4 py-2 ${mode === "login" ? "bg-[#A3FF12] text-black" : "bg-white/[0.06] text-white/60"}`}>
              Login
            </button>
            <button onClick={() => setMode("register")} className={`rounded-full px-4 py-2 ${mode === "register" ? "bg-[#A3FF12] text-black" : "bg-white/[0.06] text-white/60"}`}>
              Register
            </button>
          </div>
          {error && <p className="mb-4 rounded-2xl bg-red-500/10 p-3 text-red-100">{error}</p>}
          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && <Input label="Name" value={form.name} onChange={(name) => setForm({ ...form, name })} />}
            {mode === "register" && <Input label="Username" value={form.username} onChange={(username) => setForm({ ...form, username })} />}
            <Input label="Email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
            <Input label="Password" type="password" value={form.password} onChange={(password) => setForm({ ...form, password })} />
            <button className="w-full rounded-full bg-[#A3FF12] px-5 py-3 font-semibold text-black">
              {mode === "login" ? "Login" : "Create account"}
            </button>
          </form>
        </Panel>
      </div>
      <ReferenceNotice />
    </main>
  );
}

function AuthModal({ initialMode = "login", reason, onClose, onLogin }) {
  const [mode, setMode] = useState(initialMode || "login");
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    phone: "",
    profilePicture: "",
    password: "",
    confirmPassword: "",
    remember: true,
    resetToken: "",
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Enter a valid email address.";
    if (mode === "register") {
      if (!form.name.trim() || !form.username.trim()) return "Full name and username are required.";
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(form.password)) return "Password must be 8+ characters with uppercase, lowercase, and a number.";
      if (form.password !== form.confirmPassword) return "Passwords do not match.";
    }
    if (mode === "login" && !form.password) return "Enter your password.";
    if (mode === "reset") {
      if (!form.resetToken.trim()) return "Reset token is required.";
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(form.password)) return "Password must be 8+ characters with uppercase, lowercase, and a number.";
      if (form.password !== form.confirmPassword) return "Passwords do not match.";
    }
    return "";
  }

  async function submit(event) {
    event.preventDefault();
    if (submitting) return;
    setError("");
    setMessage("");
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      setSubmitting(true);
      if (mode === "forgot") {
        const data = await api("/auth/forgot-password", { method: "POST", body: { email: form.email } });
        setMessage(data.message);
        setMode("reset");
        return;
      }
      if (mode === "reset") {
        await api("/auth/reset-password", { method: "POST", body: { email: form.email, token: form.resetToken, password: form.password, confirmPassword: form.confirmPassword } });
        setMessage("Password reset complete. Login with your new password.");
        setMode("login");
        return;
      }
      const data = await api(mode === "login" ? "/auth/login" : "/auth/register", {
        method: "POST",
        body: form,
      });
      onLogin(data.token);
    } catch (err) {
      setError(err.suggestions?.length ? `${err.message}. Try: ${err.suggestions.join(", ")}` : err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function continueWithGoogle() {
    if (submitting) return;
    setError("");
    try {
      setSubmitting(true);
      const data = await api("/auth/google/url");
      window.location.href = data.url;
    } catch (err) {
      setError(err.message.includes("not configured") ? "Google login is not configured yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment, then restart the backend. Email signup works now." : err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 px-4 py-6 backdrop-blur-xl">
      <div className="mx-auto my-4 w-full max-w-lg rounded-[2rem] border border-white/[0.1] bg-[#0E0E0E] p-6 shadow-2xl">
        <div className="sticky top-0 z-10 -mx-2 flex items-start justify-between gap-4 rounded-[1.5rem] bg-[#0E0E0E]/95 p-2 backdrop-blur">
          <div>
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[#A3FF12]/10 text-[#A3FF12]">
              <Lock size={22} />
            </div>
            <h2 className="text-3xl font-semibold tracking-[-0.04em]">{mode === "register" ? "Create Account" : mode === "forgot" ? "Forgot Password" : mode === "reset" ? "Reset Password" : "Login Required"}</h2>
            <p className="mt-3 text-sm leading-6 text-white/55">
              {reason || "CrackIT is free and open source. Accounts are optional and only store personal progress."}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full border border-white/[0.1] px-3 py-1 text-white/55">Close</button>
        </div>

        <button type="button" disabled={submitting} onClick={continueWithGoogle} className="mt-6 w-full rounded-2xl border border-white/[0.1] bg-white/[0.04] px-5 py-3 font-semibold text-white/80 disabled:opacity-50">
          Continue with Google
        </button>

        <div className="my-5 flex flex-wrap gap-2">
          <button type="button" disabled={submitting} onClick={() => setMode("login")} className={`rounded-full px-4 py-2 text-sm ${mode === "login" ? "bg-[#A3FF12] text-black" : "bg-white/[0.06] text-white/60"} disabled:opacity-50`}>
            Login
          </button>
          <button type="button" disabled={submitting} onClick={() => setMode("register")} className={`rounded-full px-4 py-2 text-sm ${mode === "register" ? "bg-[#A3FF12] text-black" : "bg-white/[0.06] text-white/60"} disabled:opacity-50`}>
            Sign Up
          </button>
          <button type="button" disabled={submitting} onClick={() => setMode("forgot")} className={`rounded-full px-4 py-2 text-sm ${mode === "forgot" || mode === "reset" ? "bg-[#A3FF12] text-black" : "bg-white/[0.06] text-white/60"} disabled:opacity-50`}>
            Forgot Password
          </button>
        </div>

        {error && <p className="mb-4 rounded-2xl bg-red-500/10 p-3 text-sm text-red-100">{error}</p>}
        {message && <p className="mb-4 rounded-2xl bg-[#A3FF12]/10 p-3 text-sm text-[#A3FF12]">{message}</p>}
        <form onSubmit={submit} className="space-y-4">
          {mode === "register" && <Input label="Full Name" value={form.name} onChange={(name) => setForm({ ...form, name })} />}
          {mode === "register" && <Input label="Username" value={form.username} onChange={(username) => setForm({ ...form, username })} />}
          <Input label="Email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
          {mode === "register" && <Input label="Phone Number (optional)" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />}
          {mode === "register" && <Input label="Profile Image URL (optional)" value={form.profilePicture} onChange={(profilePicture) => setForm({ ...form, profilePicture })} />}
          {mode !== "forgot" && <Input label="Password" type="password" value={form.password} onChange={(password) => setForm({ ...form, password })} />}
          {(mode === "register" || mode === "reset") && <Input label="Confirm Password" type="password" value={form.confirmPassword} onChange={(confirmPassword) => setForm({ ...form, confirmPassword })} />}
          {mode === "reset" && <Input label="Reset Token" value={form.resetToken} onChange={(resetToken) => setForm({ ...form, resetToken })} />}
          {mode === "login" && (
            <label className="flex items-center justify-between gap-3 text-sm text-white/55">
              <span className="flex items-center gap-2">
                <input type="checkbox" checked={form.remember} onChange={(event) => setForm({ ...form, remember: event.target.checked })} />
                Remember Me
              </span>
              <button type="button" onClick={() => setMode("forgot")} className="text-[#A3FF12]">Forgot Password?</button>
            </label>
          )}
          <button disabled={submitting} className="w-full rounded-full bg-[#A3FF12] px-5 py-3 font-semibold text-black disabled:opacity-60">
            {submitting ? "Please wait..." : mode === "login" ? "Login" : mode === "forgot" ? "Send Reset Link" : mode === "reset" ? "Reset Password" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}

function GuestHome({ setView, requireLogin }) {
  const guestCards = [
    ["DSA Vault", "Search real questions by topic, difficulty, and company signal.", "dsa", "01"],
    ["Quiz Reactor", "Attempt professional MCQs with scoring and explanations.", "mcq", "02"],
    ["Company Intel", "Explore process, eligibility, questions, and readiness gaps.", "companies", "03"],
    ["Career Paths", "Preview roadmaps before tracking your full progress.", "roadmaps", "04"],
    ["Career OS", "Communication, interview recovery, portfolio, tools, and career planning.", "careerOs", "05"],
  ];
  const signals = [
    ["455", "content items"],
    ["80", "quality MCQs"],
    ["10", "company paths"],
  ];

  return (
    <div className="public-experience">
      <section className="genz-hero">
        <div className="genz-grid" />
        <div className="genz-marquee">
          <span>DSA</span><span>MCQ</span><span>Projects</span><span>Roadmaps</span><span>Companies</span><span>Certificates</span>
        </div>
        <div className="genz-hero-copy">
          <p className="cinematic-kicker">Think. Code. Build. Crack.</p>
          <h1>
            Build proof.
            <span>Crack placements.</span>
          </h1>
          <p>
            CrackIT by SJ DEVS is a free, open-source prep universe: real questions, knowledge quizzes, roadmaps, product projects, company prep, and career resources in one flow.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button onClick={() => setView("mcq")} className="cinematic-primary">
              Start a fresh quiz <ArrowUpRight size={18} />
            </button>
            <button onClick={() => setView("roadmaps")} className="cinematic-secondary">
              Explore roadmaps <Sparkles size={18} />
            </button>
          </div>
        </div>
        <div className="genz-console">
          <div className="console-top"><span /> <span /> <span /></div>
          <pre>{`crackit.open()
  quiz: "fresh 8-question test"
  roadmap: "career + cert path"
  projects: "build deployable products"
  status: "free + open-source"`}</pre>
        </div>
        <div className="genz-module-stack">
          {guestCards.map(([title, copy, target, number]) => (
            <button key={title} onClick={() => setView(target)} className="genz-module-card">
              <span>{number}</span>
              <strong>{title}</strong>
              <p>{copy}</p>
            </button>
          ))}
        </div>
        <div className="cinematic-stats">
          {signals.map(([value, label]) => (
            <div key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="cinematic-about">
        <p>Not another clone.</p>
        <h2>
          A real preparation system where <span>questions, quizzes, roadmaps, company prep, projects, and certificates</span> work together.
        </h2>
      </section>
    </div>
  );
}

function ContentLibrary({ token, requireLogin }) {
  const [items, setItems] = useState([]);
  const [facets, setFacets] = useState({ categories: [], difficulties: [], topics: [], companies: [], types: [] });
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ search: "", category: "", difficulty: "", topic: "", company: "", type: "" });
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [access, setAccess] = useState({ mode: "guest", guestPercent: 35, guestUnlockedCount: 0, lockedCount: 0 });

  async function load(nextFilters = filters, nextPage = page) {
    try {
      setError("");
      const params = new URLSearchParams({ page: String(nextPage), limit: "25" });
      for (const [key, value] of Object.entries(nextFilters)) {
        if (value) params.set(key, value);
      }
      const data = await api(`/content?${params.toString()}`, { token });
      setItems(data.items);
      setFacets(data.facets);
      setSource(data.source);
      setPage(data.page || nextPage);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setAccess(data.access || { mode: token ? "registered" : "guest", guestPercent: 35, guestUnlockedCount: 0, lockedCount: 0 });
      setSelected((current) => data.items.find((item) => item.id === current?.id) || data.items[0] || null);
    } catch (err) {
      setError(`Content API failed: ${err.message}. Start the backend on http://127.0.0.1:4000.`);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function updateFilter(key, value) {
    const next = { ...filters, [key]: value };
    setFilters(next);
    load(next, 1);
  }

  async function markRead(item) {
    if (!token) return requireLogin("Progress saving is disabled in open mode. CrackIT content stays fully accessible.");
    await api(`/content/${item.id}/read`, { token, method: "POST", body: { read: !item.progress?.read } });
    await load();
  }

  async function bookmark(item) {
    if (!token) return requireLogin("Bookmarks are disabled in open mode. You can still access the full library.");
    await api(`/content/${item.id}/bookmark`, { token, method: "POST", body: { bookmarked: !item.progress?.bookmarked } });
    await load();
  }

  return (
    <div>
      <HeroTitle eyebrow="Master Pack Library" title={`${total} content items`} copy={`Search and filter content parsed from ${source || "the uploaded Ultimate Tech Interview Master Guide"}.`} />
      {!token && <SupportBanner />}
      {error && <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-100">{error}</div>}
      <div className="glass-panel mb-5 grid gap-3 rounded-[2rem] border border-white/[0.08] bg-[#0E0E0E]/78 p-4 md:grid-cols-2 lg:grid-cols-6">
        <input value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} className="min-h-11 rounded-2xl border border-white/[0.08] bg-black/40 px-4 outline-none transition focus:border-[#A3FF12]/70 focus:shadow-[0_0_0_4px_rgba(163,255,18,0.08)] lg:col-span-2" placeholder="Search across all uploaded content..." />
        <SelectFilter value={filters.category} onChange={(value) => updateFilter("category", value)} options={facets.categories} label="Category" />
        <SelectFilter value={filters.difficulty} onChange={(value) => updateFilter("difficulty", value)} options={facets.difficulties} label="Difficulty" />
        <SelectFilter value={filters.topic} onChange={(value) => updateFilter("topic", value)} options={facets.topics} label="Topic" />
        <SelectFilter value={filters.company} onChange={(value) => updateFilter("company", value)} options={facets.companies} label="Company" />
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-4">
        {[
          ["Engineering Fundamentals", "DSA, OS, DBMS, Computer Networks"],
          ["Infrastructure", "Linux, Cloud Computing, DevOps"],
          ["Modern Technologies", "AI, Machine Learning, Cybersecurity"],
          ["Career Preparation", "HR, Coding Challenges, Company Prep"],
        ].map(([category, copy]) => (
          <button key={category} onClick={() => updateFilter("category", filters.category === category ? "" : category)} className={`magnetic-button rounded-[1.5rem] border p-4 text-left ${filters.category === category ? "neon-ring border-[#A3FF12]/50 bg-[#A3FF12]/10" : "border-white/[0.08] bg-white/[0.04]"}`}>
            <strong>{category}</strong>
            <p className="mt-2 text-sm text-white/45">{copy}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm uppercase tracking-[0.2em] text-white/35">{items.length} results</p>
            <button onClick={() => updateFilter("type", filters.type === "DSA" ? "" : "DSA")} className="rounded-full border border-white/[0.1] px-3 py-1 text-sm text-white/60">DSA only</button>
          </div>
          <div className="max-h-[720px] space-y-2 overflow-y-auto pr-1">
            {items.map((item) => (
              <button key={item.id} onClick={() => setSelected(item)} className={`magnetic-button w-full rounded-2xl border p-4 text-left ${selected?.id === item.id ? "neon-ring border-[#A3FF12]/50 bg-[#A3FF12] text-black" : "border-white/[0.06] bg-white/[0.045] text-white/75"} ${item.locked ? "border-white/[0.08]" : ""}`}>
                <div className="flex items-center justify-between gap-3">
                  <strong className={item.locked ? "blur-[2px]" : ""}>{item.question}</strong>
                  {item.locked && <Lock size={16} />}
                  {item.progress?.bookmarked && <Bookmark size={16} />}
                </div>
                <p className="mt-2 text-xs opacity-70">{item.category} - {item.type} - {item.difficulty}</p>
                <p className="mt-1 text-xs opacity-55">{item.topicTags?.slice(0, 3).join(", ")}</p>
              </button>
            ))}
            {!items.length && <p className="rounded-2xl bg-white/[0.04] p-4 text-sm text-white/45">No uploaded-pack content matches this filter.</p>}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 text-sm text-white/55">
            <button disabled={page <= 1} onClick={() => load(filters, page - 1)} className="rounded-full border border-white/[0.1] px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
            <span>Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => load(filters, page + 1)} className="rounded-full border border-white/[0.1] px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
          </div>
        </Panel>

            {selected?.locked && !token ? (
          <LockedContentCard requireLogin={requireLogin} />
        ) : selected && (
          <Panel>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm text-[#A3FF12]">{selected.category} - {selected.type}</p>
                <h2 className="mt-2 text-4xl font-semibold tracking-[-0.04em]">{selected.question}</h2>
                <p className="mt-3 text-sm text-white/45">Source: {selected.source}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ActionButton onClick={() => markRead(selected)} active={selected.progress?.read} icon={Check}>
                  {selected.progress?.read ? "Read" : "Mark Read"}
                </ActionButton>
                <ActionButton onClick={() => bookmark(selected)} active={selected.progress?.bookmarked} icon={Bookmark}>
                  Bookmark
                </ActionButton>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Info title="Difficulty" text={selected.difficulty} />
              <Info title="Category" text={selected.category} />
              <Info title="Topic Tags" text={selected.topicTags?.join(", ") || "General"} />
              <Info title="Company Tags" text={selected.companyTags?.join(", ") || "General preparation"} />
            </div>

            <div className="mt-5 rounded-3xl border border-white/[0.08] bg-black/25 p-5">
              <p className="text-sm uppercase tracking-[0.25em] text-[#A3FF12]">Full Source Item</p>
              <p className="mt-3 leading-7 text-white/70">{selected.sourceLine || selected.question}</p>
              <p className="mt-5 text-sm leading-6 text-white/45">{selected.referenceNote}</p>
            </div>
          </Panel>
        )}
      </div>
      <ResourcesPanel topic={`dsa ${topic} algorithms coding`} />
    </div>
  );
}

function SelectFilter({ value, onChange, options, label }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-2xl border border-white/[0.08] bg-black/35 px-3 text-white outline-none">
      <option value="">{label}</option>
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  );
}

function ContentDetail({ token, requireLogin }) {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);

  async function load() {
    try {
      setError("");
      setLocked(false);
      const data = await api(`/content/${id}`, { token });
      setItem(data.item);
      setNote(data.item.note || "");
    } catch (err) {
      if (err.locked) {
        setLocked(true);
        return;
      }
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [id, token]);

  async function saveNote() {
    if (!token) return requireLogin("Notes are disabled in open mode. The full learning content remains accessible.");
    await api(`/content/${id}/notes`, { token, method: "POST", body: { text: note } });
    await load();
  }

  async function toggleSolved() {
    if (!token) return requireLogin("Solved tracking is disabled in open mode. You can continue learning freely.");
    await api(`/content/${id}/solved`, { token, method: "POST", body: { solved: !item.progress?.solved } });
    await load();
  }

  async function toggleBookmark() {
    if (!token) return requireLogin("Bookmarks are disabled in open mode. CrackIT stays fully accessible.");
    await api(`/content/${id}/bookmark`, { token, method: "POST", body: { bookmarked: !item.progress?.bookmarked } });
    await load();
  }

  if (locked) return <LockedContentCard requireLogin={requireLogin} />;
  if (error) return <Panel>{error}</Panel>;
  if (!item) return <Panel>Loading content...</Panel>;

  return (
    <div>
      <HeroTitle eyebrow={`${item.type} Detail`} title={item.question} copy={`Source: ${item.source}`} />
      <div className="grid gap-4 lg:grid-cols-[1fr_0.7fr]">
        <Panel>
          <div className="grid gap-4 md:grid-cols-2">
            <Info title="Difficulty" text={item.difficulty} />
            <Info title="Category" text={item.category} />
            <Info title="Topics" text={item.topicTags?.join(", ") || "General"} />
            <Info title="Companies" text={item.companyTags?.join(", ") || "General preparation"} />
          </div>
          <div className="mt-5 rounded-3xl border border-white/[0.08] bg-black/25 p-5">
            <p className="text-sm uppercase tracking-[0.25em] text-[#A3FF12]">{item.problem ? "Problem Statement" : "Source Line"}</p>
            <p className="mt-3 leading-7 text-white/70">{item.problem || item.sourceLine || item.question}</p>
            {item.examples?.length ? (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {item.examples.map((example) => <p key={example} className="rounded-2xl bg-white/[0.04] p-3 text-sm text-white/60">{example}</p>)}
              </div>
            ) : null}
            {item.constraints?.length ? <Info title="Constraints" text={item.constraints.join(" | ")} /> : null}
            {item.hints?.length ? <Info title="Hints" text={item.hints.join(" | ")} /> : null}
            {item.solution ? <Info title="Approach" text={item.solution} /> : null}
            {item.timeComplexity ? <Info title="Complexity" text={`${item.timeComplexity}, ${item.spaceComplexity}`} /> : null}
            <p className="mt-5 text-sm leading-6 text-white/45">{item.referenceNote}</p>
          </div>
        </Panel>
        <Panel>
          <div className="flex flex-wrap gap-3">
            <ActionButton onClick={toggleSolved} active={item.progress?.solved} icon={Check}>
              {item.progress?.solved ? "Solved" : "Mark Solved"}
            </ActionButton>
            <ActionButton onClick={toggleBookmark} active={item.progress?.bookmarked} icon={Bookmark}>
              Bookmark
            </ActionButton>
          </div>
          <div className="mt-5">
            <h3 className="mb-3 font-semibold">Personal Notes</h3>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} className="min-h-40 w-full rounded-2xl border border-white/[0.08] bg-black/40 p-4 outline-none" placeholder="Write your approach, mistake, or revision note..." />
            <button onClick={saveNote} className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#A3FF12] px-5 py-2 font-semibold text-black">
              <Save size={16} /> Save note
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function McqDetail({ token, requireLogin }) {
  const { id } = useParams();
  const [mcq, setMcq] = useState(null);
  const [selected, setSelected] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    setLocked(false);
    setError("");
    const localMcq = localMcqBank.find((item) => item.id === id);
    if (localMcq) {
      setMcq({ ...localMcq, options: shuffleItems(localMcq.options || []) });
      return;
    }
    setError("This MCQ was not found in the local CrackIT question bank.");
  }, [id]);

  function submit() {
    const checked = checkLocalMcqTest([mcq], { [id]: [selected] }, Date.now()).checked[0];
    setResult(checked);
  }

  if (locked) return <LockedContentCard requireLogin={requireLogin} />;
  if (error) return <Panel>{error}</Panel>;
  if (!mcq) return <Panel>Loading MCQ...</Panel>;

  return (
    <div>
      <HeroTitle eyebrow="MCQ Detail" title={mcq.question} copy={`${mcq.category || "MCQ"} - ${mcq.topic || "General"}`} />
      <Panel>
        <div className="grid gap-3 md:grid-cols-2">
          {mcq.options.map((option) => (
            <label key={option} className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white/[0.04] p-3">
              <input type="radio" name={mcq.id} onChange={() => setSelected(option)} checked={selected === option} readOnly />
              <span>{option}</span>
            </label>
          ))}
        </div>
        <button disabled={!selected} onClick={submit} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#A3FF12] px-6 py-3 font-semibold text-black disabled:opacity-40">
          <Play size={16} /> Submit answer
        </button>
        {result && <p className={`mt-4 text-sm ${result.correct ? "text-[#A3FF12]" : "text-red-300"}`}>{result.explanation}</p>}
        {result && !token && <p className="mt-4 rounded-2xl border border-[#A3FF12]/20 bg-[#A3FF12]/10 p-4 text-sm text-white/65">Your answer is checked for free. Follow SJ DEVS for updates and more CrackIT resources.</p>}
      </Panel>
    </div>
  );
}

function ResourcesPanel({ topic = "coding" }) {
  const [resources, setResources] = useState(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    api(`/resources?topic=${encodeURIComponent(topic)}`)
      .then((data) => {
        setResources(data.resources);
        setNote(data.note);
      })
      .catch(() => null);
  }, [topic]);

  if (!resources) return null;
  const sections = [
    ["YouTube Channels", "youtube"],
    ["Official Docs", "docs"],
    ["Certificates", "certificates"],
  ];
  return (
    <section className="resource-lab mt-6">
      <div className="resource-lab-head">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#A3FF12]">Right resources</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Learn from trusted places</h2>
          <p className="mt-2 max-w-3xl text-sm text-white/50">{note}</p>
        </div>
        <span className="resource-orb">free</span>
      </div>
      <div className="resource-grid">
        {sections.map(([label, key]) => (
          <div key={key} className="resource-column">
            <h3>{label}</h3>
            <div className="mt-4 space-y-3">
              {(resources[key] || []).slice(0, 4).map((item) => (
                <a key={item.url} href={item.url} target="_blank" rel="noreferrer" className="resource-card">
                  <span>{item.title}</span>
                  <p>{item.note}</p>
                  <ArrowUpRight size={16} />
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TopicPage({ title, topic, category, token, requireLogin, note }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams({ limit: "50" });
    if (topic) params.set("topic", topic);
    if (category) params.set("category", category);
    api(`/content?${params.toString()}`, { token }).then((data) => {
      setItems(data.items);
      setTotal(data.total);
    }).catch((err) => setError(err.message));
  }, [topic, category, token]);

  return (
    <div>
      <HeroTitle eyebrow={`${title} Hub`} title={`${total} real database records`} copy={note || "Content is loaded from the database, not static cards."} />
      {error && <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-100">{error}</div>}
      <Panel>
        <InfoList title="Quick Revision Notes" items={revisionNotesFor(title)} />
        <div className="mt-6" />
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <ContentMiniCard key={item.id} item={item} requireLogin={requireLogin} />
          ))}
          {!items.length && <p className="text-white/45">No matching records exist in the uploaded dataset yet.</p>}
        </div>
      </Panel>
      <ResourcesPanel topic={`${title} ${topic} ${category}`} />
    </div>
  );
}

function revisionNotesFor(title = "") {
  const notes = {
    Linux: ["pwd prints current directory; ls lists files; cd changes directory.", "grep searches text; awk processes columns; sed edits streams.", "chmod changes permissions; chown changes ownership.", "cron schedules jobs; systemd manages services.", "Pipes connect commands; redirection writes input/output to files."],
    "Operating Systems": ["A process owns resources; a thread shares process memory.", "Deadlock needs mutual exclusion, hold-and-wait, no preemption, and circular wait.", "Paging divides memory into fixed-size pages and frames.", "Semaphores and mutexes coordinate shared resources.", "Schedulers balance response time, throughput, fairness, and waiting time."],
    DBMS: ["Primary keys identify rows; foreign keys connect tables.", "Normalization reduces redundancy and update anomalies.", "Indexes speed reads but add storage and write overhead.", "Transactions should satisfy ACID properties.", "Joins combine related rows; GROUP BY aggregates rows."],
    Networking: ["DNS maps domain names to IP addresses.", "TCP is reliable and connection-oriented; UDP is faster but connectionless.", "HTTP works at the application layer; HTTPS adds TLS.", "Subnetting divides networks into smaller address ranges.", "Firewalls filter traffic based on rules."],
    Cloud: ["IaaS gives virtual infrastructure; PaaS gives managed runtime; SaaS gives complete software.", "Regions contain availability zones for fault isolation.", "Auto scaling adjusts capacity based on demand.", "IAM controls identity and permissions.", "Load balancers distribute traffic across healthy targets."],
    DevOps: ["CI builds and tests code often; CD automates release.", "Docker images are immutable templates for containers.", "Kubernetes schedules and manages containers.", "Infrastructure as Code makes environments repeatable.", "Monitoring tracks health; logs explain what happened."],
  };
  return notes[title] || notes[title.replace("MCQs", "").trim()] || notes.Networking;
}

function TechnicalMcqPage({ title, topic, token }) {
  const [mcqs, setMcqs] = useState([]);
  useEffect(() => {
    const localItems = localMcqBank
      .filter((mcq) => localMcqMatches(mcq, title, "Mixed") || localMcqMatches(mcq, "Mixed", topic) || localMcqMatches(mcq, "Mixed", title))
      .slice(0, 50);
    setMcqs(localItems);
  }, [title, topic]);

  return (
    <div>
      <HeroTitle eyebrow={`${title} MCQs`} title={`${mcqs.length} local records`} copy="These records load from CrackIT's bundled MCQ datasets. No backend/API required." />
      <Panel>
        <InfoList title="Quick Revision Notes" items={revisionNotesFor(title)} />
        <div className="mt-6" />
        <div className="grid gap-3 md:grid-cols-2">
          {mcqs.map((mcq) => (
            <div key={mcq.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-sm text-[#A3FF12]">{mcq.topic}</p>
              <h3 className="mt-2 font-semibold">{mcq.question}</h3>
              <p className="mt-2 text-xs text-white/45">{mcq.options?.slice(0, 2).join(" / ")}</p>
            </div>
          ))}
          {!mcqs.length && <p className="text-white/45">No {title} records exist in the current database yet.</p>}
        </div>
      </Panel>
      <ResourcesPanel topic={title} />
    </div>
  );
}

function ProjectsPage({ token, requireLogin }) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [levels, setLevels] = useState([]);
  const [activeLevel, setActiveLevel] = useState("All");
  const [error, setError] = useState("");

  useEffect(() => {
    api("/projects", { token })
      .then((data) => {
        setProjects(data.projects);
        setLevels(data.levels);
      })
      .catch((err) => setError(err.message));
  }, [token]);

  const visibleProjects = activeLevel === "All" ? projects : projects.filter((project) => project.level === activeLevel);

  return (
    <div>
      <HeroTitle eyebrow="Project Hub" title="Build products, not toy snippets." copy="Each blueprint is a real product idea with features, architecture, database design, APIs, resume description, and interview talking points." />
      {error && <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-100">{error}</div>}
      <div className="project-filter-row">
        {["All", ...levels].map((level) => (
          <button key={level} onClick={() => setActiveLevel(level)} className={activeLevel === level ? "active" : ""}>
            {level}
          </button>
        ))}
      </div>
      <div className="product-project-grid">
        {visibleProjects.map((project, index) => (
          <button key={project.id} onClick={() => navigate(`/projects/${project.id}`)} className="product-project-card" style={{ animationDelay: `${index * 70}ms` }}>
            <div className="flex items-start justify-between gap-4">
              <span className="project-level">{project.level}</span>
              <ArrowUpRight size={18} />
            </div>
            <h2>{project.title}</h2>
            <p>{project.oneLine}</p>
            <div className="project-stack">
              {project.techStack.slice(0, 5).map((tech) => <span key={tech}>{tech}</span>)}
            </div>
            <div className="project-mini-list">
              {project.features.slice(0, 3).map((feature) => <span key={feature}>{feature}</span>)}
            </div>
            <strong className="project-resume-line">{project.resumeDescription}</strong>
          </button>
        ))}
      </div>
      <ResourcesPanel topic="web project devops cloud dsa" />
    </div>
  );
}

function ProjectDetail({ token }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api(`/projects/${id}`, { token })
      .then((data) => setProject(data.project))
      .catch((err) => setError(err.message));
  }, [id, token]);

  if (error) return <OpenAccessNotice title={error} />;
  if (!project) return <Splash />;

  const blueprint = [
    ["Core Features", project.features],
    ["Database Structure", project.database],
    ["API Structure", project.apis],
    ["Build Plan", project.buildPlan],
    ["Interview Questions", project.interviewQuestions],
  ];

  return (
    <div>
      <button onClick={() => navigate("/projects")} className="mb-5 rounded-full border border-white/[0.1] bg-white/[0.04] px-5 py-2 text-sm text-white/65 hover:text-white">
        Back to Project Hub
      </button>
      <section className="project-detail-hero">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.26em] text-[#A3FF12]">{project.level} product blueprint</p>
          <h1>{project.title}</h1>
          <p>{project.oneLine}</p>
        </div>
        <div className="project-detail-card">
          <span>Target users</span>
          <strong>{project.audience}</strong>
          <div className="project-stack mt-5">
            {project.techStack.map((tech) => <span key={tech}>{tech}</span>)}
          </div>
        </div>
      </section>
      <div className="project-blueprint-grid">
        <Panel>
          <h2 className="text-2xl font-semibold">Architecture</h2>
          <p className="mt-3 leading-7 text-white/60">{project.architecture}</p>
          <div className="mt-5 rounded-3xl border border-[#A3FF12]/20 bg-[#A3FF12]/10 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#A3FF12]">Resume Description</p>
            <p className="mt-3 text-white/70">{project.resumeDescription}</p>
          </div>
        </Panel>
        {blueprint.map(([title, items]) => (
          <Panel key={title}>
            <h2 className="text-2xl font-semibold">{title}</h2>
            <div className="mt-5 space-y-3">
              {items.map((item, index) => (
                <div key={item} className="blueprint-row">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </Panel>
        ))}
      </div>
      <ResourcesPanel topic={`${project.title} ${project.techStack.join(" ")}`} />
    </div>
  );
}

function ContentMiniCard({ item, requireLogin }) {
  const navigate = useNavigate();
  if (item.locked) {
    return (
      <button onClick={() => requireLogin("This platform is free and open source. Continue learning without signup.")} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-left">
        <div className="flex items-center justify-between">
          <strong>{item.question}</strong>
          <Sparkles size={16} />
        </div>
      </button>
    );
  }
  return (
    <button onClick={() => navigate(`/content/${item.id}`)} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-left hover:bg-white/[0.07]">
      <p className="text-sm text-[#A3FF12]">{item.type} - {item.difficulty}</p>
      <h3 className="mt-2 font-semibold">{item.question}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/55">{item.preview || item.problem || item.sourceLine || item.topicTags?.join(", ")}</p>
      <p className="mt-2 text-xs text-white/35">{item.topicTags?.join(", ")}</p>
    </button>
  );
}

function LockedContentCard({ requireLogin }) {
  const benefits = [
    "Complete DSA Question Bank",
    "Full MCQ Library",
    "Company Interview Questions",
    "Coding Challenges",
    "Internship Roadmaps",
    "Project Hub",
    "Progress Tracking",
    "Streak System",
    "Bookmarks",
    "Personalized Dashboard",
  ];

  return (
    <Panel>
      <div className="relative overflow-hidden rounded-[2rem] border border-[#A3FF12]/20 bg-black/40 p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(163,255,18,0.18),transparent_35%)]" />
        <div className="relative">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#A3FF12]/10 text-[#A3FF12]">
            <Lock size={24} />
          </div>
          <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em]">CrackIT is free and open source.</h2>
          <p className="mt-4 max-w-xl leading-7 text-white/60">
            No payment, no forced signup, and no locked learning path. Follow SJ DEVS if the platform helps you.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3 text-sm text-white/70">
                <Check size={16} className="text-[#A3FF12]" /> {benefit}
              </div>
            ))}
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href={instagramUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#A3FF12] px-6 py-3 font-semibold text-black">
              <Instagram size={18} /> Follow on Instagram
            </a>
            <button onClick={() => requireLogin("You can continue without following. CrackIT will remain free for students.")} className="rounded-full border border-white/[0.1] px-6 py-3 text-white/75">
              Continue Learning
            </button>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function OpenAccessNotice({ title }) {
  return (
    <Panel>
      <div className="rounded-[2rem] border border-[#A3FF12]/20 bg-[#A3FF12]/10 p-7">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#A3FF12]">Open Access Mode</p>
        <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em]">{title}</h2>
        <p className="mt-4 max-w-2xl leading-7 text-white/60">
          CrackIT is currently fully open with no login, signup, or payment. Learning modules, questions, MCQs, roadmaps, companies, projects, and career resources are accessible directly.
        </p>
        <a href={instagramUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#A3FF12] px-6 py-3 font-semibold text-black">
          <Instagram size={18} /> Follow SJ DEVS for updates
        </a>
      </div>
    </Panel>
  );
}

function Dashboard({ session, setView }) {
  const { user, stats, totals, recentResults } = session;
  const lastViewed = user.lastViewed || {};
  const continueItems = [
    lastViewed.questionId && ["Last question", lastViewed.questionId.replaceAll("-", " "), "dsa"],
    lastViewed.roadmapId && ["Last roadmap", lastViewed.roadmapId.replaceAll("-", " "), "roadmaps"],
    lastViewed.quizId && ["Last quiz", lastViewed.quizId, "mcq"],
  ].filter(Boolean);
  const cards = [
    ["XP", stats.xp, Trophy, "from-[#A3FF12]/20 to-transparent"],
    ["Level", user.level, User, "from-[#66D9EF]/20 to-transparent"],
    ["Solved", `${stats.solvedCount}/${totals.questions}`, Check, "from-[#FF3D77]/18 to-transparent"],
    ["Streak", `${user.currentStreak} days`, Flame, "from-[#FFB020]/18 to-transparent"],
  ];

  return (
    <div>
      <HeroTitle eyebrow="Dashboard" title={`Welcome back, ${user.displayName}`} copy="Everything below is pulled from the backend and persisted to storage." />
      <div className="grid gap-4 md:grid-cols-4">
        {cards.map(([label, value, Icon, glow]) => (
          <div key={label} className={`glass-panel rounded-[2rem] border border-white/[0.08] bg-gradient-to-br ${glow} p-6`}>
            <Icon className="text-[#A3FF12]" />
            <p className="mt-6 text-sm text-white/45">{label}</p>
            <strong className="mt-1 block font-display text-4xl tracking-[-0.05em]">{value}</strong>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <Panel>
          <h2 className="text-2xl font-semibold">Continue Learning</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {(continueItems.length ? continueItems : [
              ["Start DSA", "No question viewed yet", "dsa"],
              ["Start MCQs", "No quiz attempted yet", "mcq"],
              ["Start Roadmaps", "No roadmap viewed yet", "roadmaps"],
            ]).map(([title, copy, target]) => (
              <button key={title} onClick={() => setView(target)} className="magnetic-button rounded-3xl border border-white/[0.08] bg-white/[0.04] p-5 text-left hover:border-[#A3FF12]/40">
                <strong className="capitalize">{title}</strong>
                <p className="mt-2 text-sm capitalize text-white/45">{copy}</p>
              </button>
            ))}
          </div>
        </Panel>
        <Panel>
          <h2 className="text-2xl font-semibold">Recent MCQ results</h2>
          <div className="mt-4 space-y-3">
            {recentResults.length ? recentResults.map((result) => (
              <div key={result.id} className="rounded-2xl bg-white/[0.04] p-4">
                <strong>{result.score}/{result.total}</strong>
                <p className="text-sm text-white/45">{new Date(result.createdAt).toLocaleString()}</p>
              </div>
            )) : <p className="text-white/45">No MCQ tests submitted yet.</p>}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function InfoList({ title, items, tone = "normal" }) {
  return (
    <div className="mt-5">
      <p className={`text-sm font-semibold uppercase tracking-[0.2em] ${tone === "warn" ? "text-[#FFB020]" : "text-[#A3FF12]"}`}>{title}</p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <p key={item} className="rounded-2xl bg-white/[0.04] p-3 text-sm text-white/60">{item}</p>
        ))}
      </div>
    </div>
  );
}

function readLocalJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function writeLocalJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function questionStats(question, index = 0) {
  const difficultyBase = { Easy: 74, Medium: 52, Hard: 31 }[question?.difficulty] || 48;
  const acceptanceRate = Math.max(18, Math.min(91, difficultyBase + ((question?.id || "").length + index) % 13));
  const frequency = question?.companies?.length >= 3 ? "Very High" : question?.companies?.length >= 2 ? "High" : "Medium";
  return { acceptanceRate, frequency };
}

function learningTipsFor(question) {
  const topic = question?.topic || "Problem Solving";
  return {
    tips: [
      `Start by naming the pattern behind ${topic}.`,
      "Write brute force first in your head, then improve the bottleneck.",
      "Speak edge cases aloud: empty input, duplicates, sorted/reversed data, and large constraints.",
    ],
    mistakes: [
      "Jumping into code before choosing a data structure.",
      "Ignoring complexity until the end.",
      "Forgetting to test one small and one boundary example.",
    ],
    followUps: [
      `How would you solve this if input size became 10x larger?`,
      `Can the ${topic} approach be made iterative or memory efficient?`,
      "What tradeoff did you choose and why?",
    ],
  };
}

function DsaModule({ token, onChange, requireLogin }) {
  const [questions, setQuestions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("All");
  const [topic, setTopic] = useState("All");
  const [solutionOpen, setSolutionOpen] = useState(false);
  const [practiceSummary, setPracticeSummary] = useState(null);
  const [toast, setToast] = useState("");
  const [openProgress, setOpenProgress] = useState(() => readLocalJson("crackit_open_dsa_progress", {}));
  const [localNotes, setLocalNotes] = useState(() => readLocalJson("crackit_open_dsa_notes", {}));

  const topics = useMemo(() => ["All", ...new Set(questions.map((question) => question.topic).sort())], [questions]);
  const companies = useMemo(() => [...new Set(questions.flatMap((question) => question.companies || []))].sort(), [questions]);
  const filteredQuestions = useMemo(() => questions.filter((question) => {
    const matchesQuery = [question.title, question.topic, ...(question.companies || [])].join(" ").toLowerCase().includes(query.toLowerCase());
    const matchesDifficulty = difficulty === "All" || question.difficulty === difficulty;
    const matchesTopic = topic === "All" || question.topic === topic;
    return matchesQuery && matchesDifficulty && matchesTopic;
  }), [questions, query, difficulty, topic]);
  const solvedToday = Object.values(openProgress).filter((item) => item.solved && item.solvedAt?.slice(0, 10) === new Date().toISOString().slice(0, 10)).length;
  const solvedCount = questions.filter((question) => question.progress?.status === "solved" || openProgress[question.id]?.solved).length;
  const currentTopicTotal = filteredQuestions.length || 1;
  const currentTopicSolved = filteredQuestions.filter((question) => question.progress?.status === "solved" || openProgress[question.id]?.solved).length;
  const weeklySolved = Object.values(openProgress).filter((item) => item.solvedAt && Date.now() - new Date(item.solvedAt).getTime() < 7 * 24 * 60 * 60 * 1000).length;
  const selectedIndex = questions.findIndex((question) => question.id === selected?.id);
  const stats = questionStats(selected, selectedIndex);
  const tips = learningTipsFor(selected);
  const relatedQuestions = useMemo(() => {
    if (!selected) return [];
    return questions
      .filter((question) => question.id !== selected.id)
      .map((question) => ({
        question,
        score: (question.topic === selected.topic ? 4 : 0)
          + (question.difficulty === selected.difficulty ? 2 : 0)
          + (question.companies || []).filter((company) => selected.companies?.includes(company)).length,
      }))
      .sort((a, b) => b.score - a.score || a.question.title.localeCompare(b.question.title))
      .slice(0, 3)
      .map((item) => item.question);
  }, [questions, selected]);

  async function load() {
    const data = await api("/questions", { token });
    const localProgress = readLocalJson("crackit_open_dsa_progress", {});
    const localNoteBank = readLocalJson("crackit_open_dsa_notes", {});
    const hydrated = data.questions.map((question) => token ? question : {
      ...question,
      progress: {
        ...(question.progress || {}),
        status: localProgress[question.id]?.solved ? "solved" : question.progress?.status,
        bookmarked: Boolean(localProgress[question.id]?.bookmarked || question.progress?.bookmarked),
      },
      note: localNoteBank[question.id] || question.note || "",
    });
    setQuestions(hydrated);
    const recent = readLocalJson("crackit_recent_dsa", []);
    const first = pickNextQuestion(hydrated, null, recent);
    const nextSelected = hydrated.find((q) => q.id === selected?.id) || first;
    setSelected(nextSelected);
    setNote((hydrated.find((q) => q.id === selected?.id) || first)?.note || "");
  }

  async function selectQuestion(question) {
    rememberQuestion(question.id);
    setSelected(question);
    setNote(token ? question.note || "" : localNotes[question.id] || question.note || "");
    setSolutionOpen(false);
    setPracticeSummary(null);
    if (token) {
      await api("/progress/last-viewed", {
        token,
        method: "POST",
        body: { topic: question.topic, questionId: question.id },
      }).catch(() => null);
      onChange();
    }
  }

  function rememberQuestion(id) {
    const recent = readLocalJson("crackit_recent_dsa", []);
    writeLocalJson("crackit_recent_dsa", [...recent.filter((item) => item !== id), id].slice(-30));
  }

  function pickNextQuestion(source = filteredQuestions, current = selected, recent = readLocalJson("crackit_recent_dsa", [])) {
    const pool = source.length ? source : questions;
    if (!pool.length) return null;
    const solvedSet = new Set(Object.entries(openProgress).filter(([, value]) => value.solved).map(([id]) => id));
    const currentTopic = current?.topic || "";
    const scored = pool
      .filter((question) => question.id !== current?.id)
      .map((question) => {
        const recentlySeen = recent.includes(question.id);
        const solved = solvedSet.has(question.id) || question.progress?.status === "solved";
        const topicShift = currentTopic && question.topic !== currentTopic ? 4 : 0;
        const difficultyMatch = difficulty === "All" || question.difficulty === difficulty ? 2 : 0;
        const randomness = Math.random() * 4;
        return {
          question,
          score: topicShift + difficultyMatch + randomness - (recentlySeen ? 8 : 0) - (solved ? 4 : 0),
        };
      })
      .sort((a, b) => b.score - a.score);
    return scored[0]?.question || pool[Math.floor(Math.random() * pool.length)];
  }

  function continuePractice() {
    const next = pickNextQuestion();
    if (!next) return;
    selectQuestion(next);
    requestAnimationFrame(() => document.getElementById("dsa-practice-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!filteredQuestions.length || !selected) return;
    if (!filteredQuestions.some((question) => question.id === selected.id)) {
      selectQuestion(pickNextQuestion(filteredQuestions));
    }
  }, [difficulty, topic, query, filteredQuestions.length]);

  async function markSolved(question) {
    if (!token) {
      const next = {
        ...openProgress,
        [question.id]: {
          ...(openProgress[question.id] || {}),
          solved: !openProgress[question.id]?.solved,
          solvedAt: !openProgress[question.id]?.solved ? new Date().toISOString() : "",
        },
      };
      setOpenProgress(next);
      writeLocalJson("crackit_open_dsa_progress", next);
      setQuestions((current) => current.map((item) => item.id === question.id ? { ...item, progress: { ...(item.progress || {}), status: next[question.id]?.solved ? "solved" : "unsolved" } } : item));
      setSolutionOpen(true);
      setToast(next[question.id]?.solved ? "Solved locally. Loading a fresh question..." : "Solved mark removed.");
      const solvedTotal = Object.values(next).filter((item) => item.solved).length;
      if (solvedTotal && solvedTotal % 10 === 0) {
        const solvedTopics = questions.filter((item) => next[item.id]?.solved).reduce((acc, item) => {
          acc[item.topic] = (acc[item.topic] || 0) + 1;
          return acc;
        }, {});
        const strong = Object.entries(solvedTopics).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([name]) => name);
        const weak = topics.filter((name) => name !== "All" && !strong.includes(name)).slice(0, 3);
        setPracticeSummary({ solvedTotal, strong, weak });
      }
      setTimeout(() => {
        if (next[question.id]?.solved) continuePractice();
        setToast("");
      }, 700);
      return;
    }
    await api(`/questions/${question.id}/solved`, { token, method: "POST", body: { solved: question.progress?.status !== "solved" } });
    await load();
    onChange();
    setSolutionOpen(true);
    setTimeout(() => continuePractice(), 700);
  }

  async function bookmark(question) {
    if (!token) {
      const next = {
        ...openProgress,
        [question.id]: { ...(openProgress[question.id] || {}), bookmarked: !openProgress[question.id]?.bookmarked },
      };
      setOpenProgress(next);
      writeLocalJson("crackit_open_dsa_progress", next);
      setQuestions((current) => current.map((item) => item.id === question.id ? { ...item, progress: { ...(item.progress || {}), bookmarked: next[question.id]?.bookmarked } } : item));
      setToast(next[question.id]?.bookmarked ? "Bookmarked locally." : "Bookmark removed.");
      setTimeout(() => setToast(""), 1200);
      return;
    }
    await api(`/questions/${question.id}/bookmark`, { token, method: "POST", body: { bookmarked: !question.progress?.bookmarked } });
    await load();
    onChange();
  }

  async function saveNote() {
    if (!selected) return;
    if (!token) {
      const next = { ...localNotes, [selected.id]: note };
      setLocalNotes(next);
      writeLocalJson("crackit_open_dsa_notes", next);
      setToast("Note saved in this browser.");
      setTimeout(() => setToast(""), 1200);
      return;
    }
    await api(`/questions/${selected.id}/notes`, { token, method: "POST", body: { text: note } });
    await load();
  }

  function showSolution() {
    setSolutionOpen(true);
  }

  return (
    <div>
      <HeroTitle eyebrow="DSA Module" title={`${questions.length}+ real prep questions.`} copy="Search, filters, full problems, and solutions are free. No login or signup required." />
      <div className="practice-sticky-bar">
        <span>{solvedToday} solved today</span>
        <span>{weeklySolved} this week</span>
        <span>{currentTopicSolved}/{currentTopicTotal} in current filter</span>
        <button onClick={continuePractice}>Continue Practice</button>
      </div>
      {toast && <div className="mb-4 rounded-2xl border border-[#A3FF12]/25 bg-[#A3FF12]/10 p-4 text-sm text-[#A3FF12]">{toast}</div>}
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Panel>
          <div className="mb-4 rounded-2xl border border-[#A3FF12]/20 bg-[#A3FF12]/10 p-4 text-sm leading-6 text-white/65">
            Company tags are preparation references. They can change by year, role, campus, team, and interviewer.
          </div>
          <div className="mb-4 space-y-3">
            <input list="question-suggestions" value={query} onChange={(event) => setQuery(event.target.value)} className="min-h-12 w-full rounded-2xl border border-white/[0.08] bg-black/35 px-4 outline-none focus:border-[#A3FF12]/60" placeholder="Instant search title, topic, company..." />
            <datalist id="question-suggestions">
              {[...topics, ...companies, "Easy", "Medium", "Hard"].filter((item) => item !== "All").map((item) => <option key={item} value={item} />)}
            </datalist>
            <div className="grid grid-cols-2 gap-2">
              <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="min-h-11 rounded-2xl border border-white/[0.08] bg-black/35 px-3 text-white outline-none">
                {["All", "Easy", "Medium", "Hard"].map((item) => <option key={item}>{item}</option>)}
              </select>
              <select value={topic} onChange={(event) => setTopic(event.target.value)} className="min-h-11 rounded-2xl border border-white/[0.08] bg-black/35 px-3 text-white outline-none">
                {topics.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">{filteredQuestions.length} matching questions</p>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full bg-[#A3FF12]" style={{ width: `${Math.min(100, (solvedCount / Math.max(1, questions.length)) * 100)}%` }} />
            </div>
          </div>
          <div className="max-h-[720px] space-y-2 overflow-y-auto pr-1">
            {filteredQuestions.map((question) => (
              <button key={question.id} onClick={() => selectQuestion(question)} className={`question-list-item ${selected?.id === question.id ? "active" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <strong>{question.title}</strong>
                  {question.progress?.bookmarked && <Bookmark size={15} />}
                </div>
                <p className="mt-1 text-sm opacity-70">{question.difficulty} - {question.topic}</p>
                <p className="mt-1 text-xs opacity-55">{question.companies?.slice(0, 3).join(", ")}</p>
              </button>
            ))}
            {!filteredQuestions.length && <p className="rounded-2xl bg-white/[0.04] p-4 text-sm text-white/45">No questions match this filter.</p>}
          </div>
        </Panel>
        {selected && (
          <Panel>
            <div id="dsa-practice-panel" />
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="question-badge-row">
                  <span>{selected.difficulty}</span>
                  <span>{selected.topic}</span>
                  {selected.companies?.slice(0, 4).map((company) => <span key={company}>{company}</span>)}
                </div>
                <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">{selected.title}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <ActionButton onClick={() => markSolved(selected)} active={selected.progress?.status === "solved"} icon={Check}>
                  {selected.progress?.status === "solved" ? "Solved" : "Mark Solved"}
                </ActionButton>
              <ActionButton onClick={() => bookmark(selected)} active={selected.progress?.bookmarked} icon={Bookmark}>
                  Bookmark
                </ActionButton>
                <button onClick={continuePractice} className="tool-button">Next Question</button>
              </div>
            </div>
            <div className="question-stat-strip">
              <Info title="Acceptance Rate" text={`${stats.acceptanceRate}% estimated`} />
              <Info title="Interview Frequency" text={stats.frequency} />
              <Info title="Progress" text={`${currentTopicSolved}/${currentTopicTotal} in filter`} />
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Info title="Problem" text={selected.problem} />
              <Info title="Explanation" text={selected.explanation} />
              <Info title="Companies" text={selected.companies.join(", ")} />
              <Info title="Complexity" text={`${selected.timeComplexity}, ${selected.spaceComplexity}`} />
              <Info title="Reference Note" text={selected.referenceNote || "Company tags are for preparation reference only."} />
            </div>
            <div className="mt-5 rounded-3xl border border-white/[0.08] bg-black/25 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">Solution</h3>
                  <p className="mt-1 text-sm text-white/45">Solutions are free. Follow SJ DEVS if CrackIT helps you.</p>
                </div>
                <button onClick={showSolution} className="inline-flex items-center gap-2 rounded-full bg-[#A3FF12] px-5 py-2 font-semibold text-black">
                  <Sparkles size={16} /> Show Solution
                </button>
              </div>
              {solutionOpen && (
                <div className="mt-5 grid gap-4">
                  <Info title="Correct Approach" text={selected.solution} />
                  <Info title="Why it works" text={selected.explanation || "The selected pattern matches the constraints and avoids unnecessary repeated work."} />
                  <Info title="Why weaker approaches fail" text="Brute force often repeats the same work, misses edge cases, or exceeds the expected time complexity in interviews." />
                  <Info title="Related Concepts" text={[selected.topic, "Complexity analysis", "Edge cases", "Pattern recognition"].join(", ")} />
                </div>
              )}
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <InfoList title="Interview Tips" items={tips.tips} />
              <InfoList title="Common Mistakes" items={tips.mistakes} tone="warn" />
              <InfoList title="Follow-up Questions" items={tips.followUps} />
            </div>
            {practiceSummary && (
              <div className="mt-5 rounded-3xl border border-[#A3FF12]/30 bg-[#A3FF12]/10 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#A3FF12]">10-question checkpoint</p>
                <h3 className="mt-3 text-2xl font-semibold">Performance Summary</h3>
                <p className="mt-3 text-white/65">Strong areas: {practiceSummary.strong.join(", ") || "building up"}</p>
                <p className="mt-2 text-white/65">Recommended topics: {practiceSummary.weak.join(", ") || "continue mixed practice"}</p>
              </div>
            )}
            <div className="mt-5 rounded-3xl border border-white/[0.08] bg-black/25 p-5">
              <h3 className="mb-3 font-semibold">You may also like</h3>
              <div className="grid gap-3 md:grid-cols-3">
                {relatedQuestions.map((question) => (
                  <button key={question.id} onClick={() => selectQuestion(question)} className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 text-left transition hover:-translate-y-1 hover:border-[#A3FF12]/35">
                    <strong>{question.title}</strong>
                    <p className="mt-2 text-sm text-white/50">{question.difficulty} - {question.topic}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-5 rounded-3xl border border-white/[0.08] bg-black/25 p-5">
              <h3 className="mb-3 font-semibold">Personal Notes</h3>
              <textarea value={note} onChange={(event) => setNote(event.target.value)} className="min-h-32 w-full rounded-2xl border border-white/[0.08] bg-black/40 p-4 outline-none" placeholder="Write your approach, mistake, or revision note..." />
              <button onClick={saveNote} className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#A3FF12] px-5 py-2 font-semibold text-black">
                <Save size={16} /> Save note
              </button>
            </div>
          </Panel>
        )}
      </div>
      <ResourcesPanel topic={`dsa ${topic} algorithms coding`} />
    </div>
  );
}

function McqModule({ token, requireLogin }) {
  const [mcqs, setMcqs] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [startedAt, setStartedAt] = useState(Date.now());
  const [error, setError] = useState("");
  const [testRound, setTestRound] = useState(0);
  const [domain, setDomain] = useState("Mixed");
  const [topicFilter, setTopicFilter] = useState("Mixed");
  const [loadingTest, setLoadingTest] = useState(false);
  const quizDomains = ["Mixed", "DSA", "Operating Systems", "DBMS", "Computer Networks", "Linux", "Cloud Computing", "DevOps", "AI & ML", "Cyber Security", "System Design"];
  const quizTopics = {
    Mixed: ["Mixed"],
    DSA: ["Mixed", "Arrays", "Strings", "Hashing", "Stacks", "Queues", "Trees", "Graphs", "Dynamic Programming", "Greedy", "Backtracking"],
    "Operating Systems": ["Mixed", "Process states", "Threads", "Deadlocks", "Scheduling", "Paging", "Virtual memory", "Semaphores", "Mutex"],
    DBMS: ["Mixed", "Keys", "Normalization", "Joins", "Indexes", "Transactions", "ACID", "SQL aggregation"],
    "Computer Networks": ["Mixed", "OSI model", "TCP", "UDP", "DNS", "HTTP", "HTTPS", "Subnetting", "Routing"],
    Linux: ["Mixed", "pwd and ls", "grep", "chmod", "cron", "systemd", "pipes", "shell scripting"],
    "Cloud Computing": ["Mixed", "IaaS", "PaaS", "SaaS", "Virtual machines", "Object storage", "Load balancing", "IAM"],
    DevOps: ["Mixed", "CI/CD", "Docker", "Kubernetes", "Jenkins", "Infrastructure as Code", "Monitoring", "Rollback"],
    "AI & ML": ["Mixed", "Overfitting", "Underfitting", "Gradient descent", "Confusion matrix", "Cross-validation", "Regression", "RAG"],
    "Cyber Security": ["Mixed", "CIA triad", "Phishing", "Encryption", "Hashing", "MFA", "SQL injection", "XSS", "OWASP"],
    "System Design": ["Mixed", "Caching", "Rate limiting", "Load balancing", "Sharding", "Replication", "Message queues", "CDN"],
  };

  function loadTest() {
    setError("");
    setResult(null);
    setAnswers({});
    setStartedAt(Date.now());
    setLoadingTest(true);
    try {
      const recentKey = `crackit_recent_mcqs_${domain}_${topicFilter}`;
      const recent = JSON.parse(sessionStorage.getItem(recentKey) || "[]");
      const questions = buildLocalMcqTest({
        domain,
        topic: topicFilter,
        count: domain === "Mixed" ? 8 : 6,
        avoid: recent.slice(-36),
      });
      setMcqs(questions);
      const nextRecent = [...recent, ...questions.map((mcq) => mcq.id)].slice(-48);
      sessionStorage.setItem(recentKey, JSON.stringify(nextRecent));
      setTestRound((round) => round + 1);
    } catch (err) {
      setError(`Local MCQ engine failed: ${err.message}`);
    } finally {
      setLoadingTest(false);
    }
  }

  useEffect(() => {
    loadTest();
    setStartedAt(Date.now());
  }, [domain, topicFilter]);

  function changeDomain(nextDomain) {
    setDomain(nextDomain);
    setTopicFilter("Mixed");
  }

  function submit() {
    setResult(checkLocalMcqTest(mcqs, answers, startedAt));
  }

  function chooseAnswer(mcq, option) {
    setAnswers({ ...answers, [mcq.id]: [option] });
  }

  return (
    <div className="quiz-stage">
      <section className="quiz-hero">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#A3FF12]">Quiz Reactor</p>
          <h1 className="mt-4 font-display text-5xl font-semibold tracking-[-0.05em] md:text-7xl">Fresh test. Every run.</h1>
          <p className="mt-4 max-w-2xl text-white/55">Choose a domain, refresh anytime, avoid repeated MCQs, and practice with a mixed difficulty set.</p>
        </div>
        <div className="quiz-pulse-card">
          <span>Round</span>
          <strong>{String(testRound || 1).padStart(2, "0")}</strong>
          <p>{domain}{topicFilter !== "Mixed" ? ` / ${topicFilter}` : ""}</p>
        </div>
      </section>
      {error && <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-100">{error}</div>}
      <Panel>
        <div className="quiz-control-panel mb-6">
          <label>
            <span>Domain</span>
            <select value={domain} onChange={(event) => changeDomain(event.target.value)}>
              {quizDomains.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>Topic</span>
            <select value={topicFilter} onChange={(event) => setTopicFilter(event.target.value)}>
              {(quizTopics[domain] || ["Mixed"]).map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <button onClick={loadTest} disabled={loadingTest} className="quiz-refresh-button">
            {loadingTest ? "Refreshing..." : "Refresh Quiz"}
          </button>
        </div>
        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          <InfoList title="OS Notes" items={revisionNotesFor("Operating Systems").slice(0, 3)} />
          <InfoList title="Cloud Notes" items={revisionNotesFor("Cloud").slice(0, 3)} />
          <InfoList title="DevOps Notes" items={revisionNotesFor("DevOps").slice(0, 3)} />
        </div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-white/45">Loaded locally from CrackIT's bundled MCQ datasets. No backend/API required.</p>
          <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm text-white/55">{mcqs.length || 8} questions</span>
        </div>
        <div className="quiz-question-grid">
          {mcqs.map((mcq, index) => (
            <div key={mcq.id} className="quiz-question-card" style={{ animationDelay: `${index * 55}ms` }}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="quiz-index">Q{index + 1}</span>
                <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-white/45">{mcq.difficulty || "Mixed"}</span>
              </div>
              <h3 className="mt-4 font-semibold leading-7">{mcq.question}</h3>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {mcq.options.map((option) => (
                  <label key={option} className={`quiz-option ${answers[mcq.id]?.[0] === option ? "selected" : ""}`}>
                    <input type="radio" name={mcq.id} onChange={() => chooseAnswer(mcq, option)} checked={answers[mcq.id]?.[0] === option} readOnly />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
              {result && (
                <div className={`quiz-review ${result.checked.find((item) => item.id === mcq.id)?.correct ? "correct" : "wrong"}`}>
                  <strong>{result.checked.find((item) => item.id === mcq.id)?.correct ? "Correct" : "Review this"}</strong>
                  <p>{result.checked.find((item) => item.id === mcq.id)?.explanation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        <button onClick={submit} disabled={!mcqs.length} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#A3FF12] px-6 py-3 font-semibold text-black disabled:opacity-40">
          <Play size={16} /> Submit test
        </button>
        {result && <strong className="ml-4 inline-flex rounded-full border border-[#A3FF12]/25 bg-[#A3FF12]/10 px-4 py-2 text-[#A3FF12]">Score: {result.score}/{result.total}</strong>}
        {result && !result.saved && (
          <div className="mt-5 rounded-3xl border border-[#A3FF12]/20 bg-[#A3FF12]/10 p-5 text-white/70">
            Your test was checked for free. CrackIT stays open for students. Follow SJ DEVS for updates and new resources.
            <a href={instagramUrl} target="_blank" rel="noreferrer" className="ml-0 mt-4 inline-flex rounded-full bg-[#A3FF12] px-5 py-2 font-semibold text-black md:ml-4 md:mt-0">
              Follow SJ DEVS
            </a>
          </div>
        )}
      </Panel>
      <ResourcesPanel topic="dsa os dbms networking linux cloud devops ai cybersecurity" />
    </div>
  );
}

const communicationExamples = [
  {
    title: "Fresher Introduction",
    script: "Good morning. I am a final-year computer science student focused on DSA, full-stack development, and practical projects. I have built projects like a placement tracker and quiz platform, and I enjoy solving problems with clean logic and readable code. I am looking for an entry-level role where I can learn fast, contribute to real products, and improve as an engineer.",
  },
  {
    title: "Internship Introduction",
    script: "Hi, I am a student developer interested in learning by building. I know the basics of programming, DSA, Git, and web development, and I am currently building projects to improve my backend and frontend skills. I am looking for an internship where I can work with a team, understand production workflows, and contribute sincerely.",
  },
  {
    title: "Placement Introduction",
    script: "Hello, I am a placement-ready software engineering candidate with a strong interest in problem solving and product development. I have practiced DSA, revised CS fundamentals, and built deployable projects. My goal is to join a team where I can write reliable code, learn from senior engineers, and solve meaningful business problems.",
  },
];

const hrQuestionBank = [
  "Tell me about yourself.",
  "Why should we hire you?",
  "What are your strengths and weaknesses?",
  "Tell me about a leadership example.",
  "How do you resolve conflict in a team?",
  "What are your short-term and long-term career goals?",
  "Explain your best project.",
  "Tell me about a time you failed and what you learned.",
];

const answerRatings = [
  {
    question: "Why should we hire you?",
    bad: "Because I need a job and I am hardworking.",
    average: "I know Java, SQL, and DSA basics. I can learn new things and work with your team.",
    excellent: "You should hire me because I combine fundamentals with practical building. I have practiced DSA, built full-stack projects, and I can explain tradeoffs clearly. I may be a fresher, but I learn fast, take feedback well, and can contribute to reliable features with ownership.",
  },
  {
    question: "What is your weakness?",
    bad: "I have no weakness.",
    average: "Sometimes I take more time to finish tasks.",
    excellent: "Earlier I spent too much time perfecting small details. I improved this by setting time boxes, shipping a working version first, and then polishing based on feedback. This helped me complete projects faster without losing quality.",
  },
];

const gdTopics = [
  {
    topic: "Will automation reduce entry-level developer jobs?",
    category: "Technology",
    opening: "Automation will change entry-level work, but it will not remove the need for builders who understand fundamentals and can use tools responsibly.",
    arguments: ["Routine tasks may reduce, but product thinking becomes more valuable.", "Students should build projects and learn debugging, not only syntax.", "Companies still need people who understand users, systems, and tradeoffs."],
    closing: "So the safe strategy is not fear, but upskilling: fundamentals plus practical product building.",
    mistakes: ["Speaking emotionally without examples", "Interrupting others", "Only saying AI will replace everyone"],
  },
  {
    topic: "Are startups better than large companies for freshers?",
    category: "Business",
    opening: "Both can be good depending on the student's learning style, risk appetite, and mentorship needs.",
    arguments: ["Startups can give broad ownership.", "Large companies often provide structure, brand value, and mentorship.", "The best choice depends on role clarity, manager quality, and learning speed."],
    closing: "Freshers should compare learning, stability, mentorship, and growth instead of chasing only brand names.",
    mistakes: ["Calling one side always better", "Ignoring salary and stability", "Not considering mentorship"],
  },
];

const failureScenarios = [
  {
    rounds: ["Aptitude: Pass", "Coding Round: Pass", "Technical Round: Pass", "HR Round: Fail"],
    reason: "Generic answers, weak communication, and poor project explanation.",
    improvements: ["Prepare a 60-second introduction", "Use STAR format for behavioral answers", "Explain project problem, users, architecture, and impact", "Practice aloud with a timer"],
  },
  {
    rounds: ["Aptitude: Pass", "Coding Round: Fail"],
    reason: "Could not identify the pattern and missed edge cases.",
    improvements: ["Revise arrays, hashing, two pointers, and sliding window", "Write brute force first, then optimize", "Practice 2 easy + 1 medium daily for 14 days", "Explain complexity after every solve"],
  },
];

const projectInterviewQuestions = [
  "Why did you choose this project?",
  "Who is the target user?",
  "Why React or your chosen frontend?",
  "Why MongoDB/PostgreSQL or your chosen database?",
  "How would you scale this system?",
  "What was the hardest bug?",
  "What security risks exist?",
  "What would you improve in version 2?",
];

const careerRoles = [
  { role: "Software Engineer", skills: ["DSA", "OOP", "DBMS", "OS", "CN", "Git"], projects: ["REST API", "Placement tracker", "Quiz platform"], salary: "Medium to high", roadmap: "Programming -> DSA -> CS fundamentals -> Projects -> Interviews" },
  { role: "AI Engineer", skills: ["Python", "Statistics", "ML", "DL", "LLMs"], projects: ["RAG notes search", "Resume analyzer", "ML dashboard"], salary: "High", roadmap: "Python -> Math -> ML -> Deep Learning -> LLM projects" },
  { role: "Cloud Engineer", skills: ["Linux", "Networking", "AWS/Azure/GCP", "IAM"], projects: ["Cloud deployment", "Monitoring dashboard", "IaC setup"], salary: "High", roadmap: "Linux -> Networking -> Cloud basics -> Deployments -> IaC" },
  { role: "DevOps Engineer", skills: ["Linux", "Docker", "Kubernetes", "CI/CD"], projects: ["CI/CD pipeline", "Dockerized app", "Deployment dashboard"], salary: "High", roadmap: "Linux -> Git -> Docker -> Kubernetes -> CI/CD" },
  { role: "Cyber Security Engineer", skills: ["Networking", "Linux", "OWASP", "Threat analysis"], projects: ["Secure notes lab", "OWASP reports", "SOC mini dashboard"], salary: "High", roadmap: "Networking -> Linux -> Web security -> Labs -> Reports" },
  { role: "Data Scientist", skills: ["Python", "SQL", "Statistics", "ML", "Visualization"], projects: ["Prediction app", "EDA dashboard", "Recommendation system"], salary: "High", roadmap: "Python -> SQL -> Statistics -> ML -> Portfolio notebooks" },
];

const architectureGallery = [
  {
    name: "Learning Management System",
    folders: ["client/src", "server/routes", "server/models", "server/controllers", "docs"],
    database: ["users", "courses", "lessons", "progress", "quizzes"],
    er: "User 1-N Progress N-1 Lesson, Course 1-N Lesson, Lesson 1-N Quiz",
    apis: ["GET /courses", "POST /progress", "GET /lessons/:id", "POST /quiz/submit"],
    deployment: "Vercel frontend + Render backend + MongoDB Atlas free tier or local JSON for demo.",
  },
  {
    name: "Placement Tracker",
    folders: ["client/pages", "api/applications", "api/companies", "api/reports"],
    database: ["students", "companies", "applications", "rounds", "notes"],
    er: "Student 1-N Application N-1 Company, Application 1-N Round",
    apis: ["POST /applications", "PATCH /applications/:id/status", "GET /reports/summary"],
    deployment: "Static frontend with lightweight Express API and exportable JSON backup.",
  },
  {
    name: "Chat App",
    folders: ["client/components", "server/socket", "server/messages", "shared/types"],
    database: ["users", "rooms", "messages", "members"],
    er: "User N-N Room through Members, Room 1-N Message",
    apis: ["GET /rooms", "POST /rooms", "GET /messages/:roomId", "POST /messages"],
    deployment: "Frontend + WebSocket-capable backend; start with polling if hosting is limited.",
  },
];

const interviewExperiences = [
  { company: "TCS", role: "Ninja/Digital", questions: ["OOP concepts", "SQL joins", "Basic coding", "Tell me about yourself"], difficulty: "Easy to Medium", lesson: "Communication and fundamentals matter as much as code." },
  { company: "Amazon", role: "SDE Intern", questions: ["Arrays", "Trees", "Leadership principles", "Project deep dive"], difficulty: "Medium to Hard", lesson: "Practice explaining tradeoffs and edge cases." },
  { company: "Microsoft", role: "SDE", questions: ["DP", "Trees", "System design basics", "Behavioral stories"], difficulty: "Medium to Hard", lesson: "Clarity, structured thinking, and clean code matter." },
];

const techDecisions = [
  { title: "React vs Angular", pros: ["React is flexible and widely used", "Angular gives a complete framework"], cons: ["React needs ecosystem choices", "Angular has a steeper learning curve"], useCases: ["React for fast product UI", "Angular for large enterprise apps"] },
  { title: "Java vs Python", pros: ["Java is strong for enterprise and OOP", "Python is fast for scripting, data, and AI"], cons: ["Java is verbose", "Python can be slower at runtime"], useCases: ["Java for backend systems", "Python for automation, ML, and APIs"] },
  { title: "MongoDB vs PostgreSQL", pros: ["MongoDB is flexible for documents", "PostgreSQL is strong for relational integrity"], cons: ["MongoDB can become messy without schema rules", "PostgreSQL needs stronger schema planning"], useCases: ["MongoDB for flexible content", "PostgreSQL for transactions and relational data"] },
  { title: "AWS vs Azure", pros: ["AWS has broad service maturity", "Azure is strong with Microsoft ecosystem"], cons: ["AWS service depth can be overwhelming", "Azure naming can be confusing"], useCases: ["AWS for cloud-native breadth", "Azure for enterprise Microsoft-heavy teams"] },
];

const patternMaps = [
  { pattern: "Sliding Window", connects: ["Arrays", "Strings", "Subarrays", "Frequency Map"], example: "Longest substring without repeating characters" },
  { pattern: "Two Pointer", connects: ["Sorted arrays", "Linked lists", "Pair search", "Palindromes"], example: "Container with most water" },
  { pattern: "Greedy", connects: ["Intervals", "Scheduling", "Local optimum", "Proof"], example: "Non-overlapping intervals" },
  { pattern: "Graphs", connects: ["BFS", "DFS", "Topological Sort", "Union Find"], example: "Course schedule" },
  { pattern: "Dynamic Programming", connects: ["State", "Transition", "Base case", "Optimization"], example: "Coin change" },
];

const rejectionReasons = [
  { reason: "Poor Resume", fix: "Add quantified project impact, clean formatting, GitHub links, and role keywords." },
  { reason: "Weak DSA", fix: "Revise top patterns and solve easy/medium questions consistently for 30 days." },
  { reason: "Weak Communication", fix: "Practice intro, HR answers, project explanation, and STAR stories aloud." },
  { reason: "No Projects", fix: "Build 2 deployable products and document architecture, APIs, and tradeoffs." },
  { reason: "No Internship", fix: "Show proof through open source, freelance-style projects, hackathons, or campus tools." },
];

const softSkills = [
  { skill: "Professional Email Writing", lesson: "Use clear subject, context, request, deadline, and polite closing." },
  { skill: "LinkedIn Networking", lesson: "Send short, specific messages and mention why you are reaching out." },
  { skill: "Workplace Etiquette", lesson: "Be punctual, document work, ask clear questions, and update blockers early." },
  { skill: "Critical Thinking", lesson: "Separate facts, assumptions, risks, and decisions before giving an answer." },
  { skill: "Teamwork", lesson: "Respect different views, communicate progress, and own your part of the outcome." },
];

function CareerOS() {
  const [skillsInput, setSkillsInput] = useState("Java, SQL, React");
  const [targetRole, setTargetRole] = useState("Software Engineer");
  const [portfolio, setPortfolio] = useState({ projects: "2", github: "yes", resume: "yes", linkedin: "no" });
  const [jsonText, setJsonText] = useState('{"name":"CrackIT","free":true}');
  const [toolOutput, setToolOutput] = useState("");
  const [regex, setRegex] = useState("\\b[A-Z][a-z]+\\b");
  const [regexText, setRegexText] = useState("Sujan builds CrackIT for Students");
  const [password, setPassword] = useState("");
  const [markdown, setMarkdown] = useState("## CrackIT\n- Free\n- Open Source\n- Career OS");
  const [base64, setBase64] = useState("CrackIT by SJ DEVS");
  const [sql, setSql] = useState("select name,email from users where active=true order by created_at desc");
  const [activity, setActivity] = useState(() => JSON.parse(localStorage.getItem("crackit_career_activity") || "{}"));

  const role = careerRoles.find((item) => item.role === targetRole) || careerRoles[0];
  const userSkills = skillsInput.toLowerCase().split(",").map((item) => item.trim()).filter(Boolean);
  const missingSkills = role.skills.filter((skill) => !userSkills.some((owned) => skill.toLowerCase().includes(owned) || owned.includes(skill.toLowerCase())));
  const portfolioScore = Math.min(100, (Number(portfolio.projects || 0) * 20) + (portfolio.github === "yes" ? 20 : 0) + (portfolio.resume === "yes" ? 20 : 0) + (portfolio.linkedin === "yes" ? 20 : 0));
  const decay = ["Arrays", "SQL", "Linux", "Projects", "Communication"].map((skill, index) => {
    const days = [30, 12, 45, 8, 21][index];
    return { skill, days, risk: days > 25 ? "High" : days > 14 ? "Medium" : "Low" };
  });

  function markToday(type) {
    const key = new Date().toISOString().slice(0, 10);
    const next = { ...activity, [key]: { ...(activity[key] || {}), [type]: ((activity[key] || {})[type] || 0) + 1 } };
    setActivity(next);
    localStorage.setItem("crackit_career_activity", JSON.stringify(next));
  }

  function formatJson() {
    try {
      setToolOutput(JSON.stringify(JSON.parse(jsonText), null, 2));
    } catch (err) {
      setToolOutput(`Invalid JSON: ${err.message}`);
    }
  }

  function testRegex() {
    try {
      const matches = regexText.match(new RegExp(regex, "g")) || [];
      setToolOutput(matches.length ? matches.join(", ") : "No matches");
    } catch (err) {
      setToolOutput(`Invalid regex: ${err.message}`);
    }
  }

  function generatePassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
    const next = Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    setPassword(next);
    setToolOutput(next);
  }

  function formatSql() {
    const formatted = sql
      .replace(/\bselect\b/ig, "SELECT")
      .replace(/\bfrom\b/ig, "\nFROM")
      .replace(/\bwhere\b/ig, "\nWHERE")
      .replace(/\border by\b/ig, "\nORDER BY")
      .replace(/\bgroup by\b/ig, "\nGROUP BY")
      .replace(/\band\b/ig, "\n  AND");
    setToolOutput(formatted);
  }

  function renderMarkdownPreview(text) {
    return text.split("\n").map((line, index) => {
      if (line.startsWith("## ")) return <h3 key={index}>{line.replace("## ", "")}</h3>;
      if (line.startsWith("# ")) return <h2 key={index}>{line.replace("# ", "")}</h2>;
      if (line.startsWith("- ")) return <p key={index}>• {line.replace("- ", "")}</p>;
      return <p key={index}>{line || "\u00a0"}</p>;
    });
  }

  const activityDays = Array.from({ length: 35 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (34 - index));
    const key = date.toISOString().slice(0, 10);
    const count = Object.values(activity[key] || {}).reduce((sum, value) => sum + value, 0);
    return { key, count };
  });

  return (
    <div>
      <HeroTitle eyebrow="CrackIT Career OS" title="Career growth beyond DSA." copy="Communication, interviews, portfolio, projects, tools, career planning, and soft skills. No login, no AI APIs, no paid services." />
      <section className="career-os-grid">
        <Panel>
          <h2 className="text-3xl font-semibold">Communication Skills Center</h2>
          <InfoList title="Self Introduction Builder" items={communicationExamples.map((item) => `${item.title}: ${item.script}`)} />
          <InfoList title="HR Question Bank" items={hrQuestionBank} />
        </Panel>
        <Panel>
          <h2 className="text-3xl font-semibold">Answer Rating System</h2>
          {answerRatings.map((item) => (
            <div key={item.question} className="mt-5 rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5">
              <h3 className="font-semibold text-[#A3FF12]">{item.question}</h3>
              <Info title="Bad Answer" text={item.bad} />
              <Info title="Average Answer" text={item.average} />
              <Info title="Excellent Answer" text={item.excellent} />
            </div>
          ))}
        </Panel>
        <Panel>
          <h2 className="text-3xl font-semibold">Group Discussion Hub</h2>
          {gdTopics.map((item) => (
            <div key={item.topic} className="mt-5 rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5">
              <p className="text-sm text-[#A3FF12]">{item.category}</p>
              <h3 className="mt-2 text-xl font-semibold">{item.topic}</h3>
              <Info title="Opening" text={item.opening} />
              <Info title="Strong Arguments" text={item.arguments.join(" | ")} />
              <Info title="Closing" text={item.closing} />
              <Info title="Common Mistakes" text={item.mistakes.join(" | ")} />
            </div>
          ))}
        </Panel>
        <Panel>
          <h2 className="text-3xl font-semibold">Public Speaking Guide</h2>
          <InfoList title="Practice Rules" items={["Confidence: speak slower than your nervous speed.", "Eye contact: look at the interviewer while making key points.", "Voice modulation: stress numbers, project impact, and decisions.", "Interview presence: sit upright, pause before answering, and finish with a clear conclusion."]} />
        </Panel>
        <Panel>
          <h2 className="text-3xl font-semibold">Interview Failure Simulator</h2>
          {failureScenarios.map((item) => (
            <div key={item.reason} className="mt-5 rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5">
              <Info title="Round Flow" text={item.rounds.join(" -> ")} />
              <Info title="Failure Reason" text={item.reason} />
              <Info title="Improvements" text={item.improvements.join(" | ")} />
            </div>
          ))}
        </Panel>
        <Panel>
          <h2 className="text-3xl font-semibold">Project Interview Mode</h2>
          <InfoList title="Questions Every Project Must Answer" items={projectInterviewQuestions} />
        </Panel>
        <Panel>
          <h2 className="text-3xl font-semibold">Skill Decay Tracker</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {decay.map((item) => (
              <div key={item.skill} className={`skill-risk ${item.risk.toLowerCase()}`}>
                <strong>{item.skill}</strong>
                <p>Last practiced: {item.days} days ago</p>
                <span>{item.risk} risk</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-white/50">Recommendation: revise High-risk skills first with 20-minute refresh sessions.</p>
        </Panel>
        <Panel>
          <h2 className="text-3xl font-semibold">Career Reality Check</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <label className="block"><span className="mb-2 block text-sm text-white/45">Current skills</span><input value={skillsInput} onChange={(event) => setSkillsInput(event.target.value)} className="min-h-12 w-full rounded-2xl border border-white/[0.08] bg-black/35 px-4 outline-none" /></label>
            <label className="block"><span className="mb-2 block text-sm text-white/45">Target role</span><select value={targetRole} onChange={(event) => setTargetRole(event.target.value)} className="min-h-12 w-full rounded-2xl border border-white/[0.08] bg-black/35 px-4 outline-none">{careerRoles.map((item) => <option key={item.role}>{item.role}</option>)}</select></label>
          </div>
          <Info title="Missing Skills" text={missingSkills.join(", ") || "You have the main listed skills. Build projects now."} />
          <Info title="Estimated Learning Time" text={`${Math.max(4, missingSkills.length * 3)} to ${Math.max(8, missingSkills.length * 5)} weeks with consistent practice`} />
          <Info title="Required Projects" text={role.projects.join(", ")} />
        </Panel>
        <Panel>
          <h2 className="text-3xl font-semibold">Portfolio Reviewer</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <label className="block"><span className="mb-2 block text-sm text-white/45">Projects count</span><input value={portfolio.projects} onChange={(event) => setPortfolio({ ...portfolio, projects: event.target.value })} className="min-h-12 w-full rounded-2xl border border-white/[0.08] bg-black/35 px-4 outline-none" /></label>
            {["github", "resume", "linkedin"].map((key) => (
              <label key={key} className="block"><span className="mb-2 block text-sm capitalize text-white/45">{key}</span><select value={portfolio[key]} onChange={(event) => setPortfolio({ ...portfolio, [key]: event.target.value })} className="min-h-12 w-full rounded-2xl border border-white/[0.08] bg-black/35 px-4 outline-none"><option>yes</option><option>no</option></select></label>
            ))}
          </div>
          <strong className="mt-5 block font-display text-5xl text-[#A3FF12]">{portfolioScore}/100</strong>
          <Info title="Suggestions" text="Add deployed links, README screenshots, architecture notes, resume bullets with numbers, and a clean LinkedIn headline." />
        </Panel>
        <Panel>
          <h2 className="text-3xl font-semibold">Tech Career Explorer</h2>
          <div className="mt-5 grid gap-3">
            {careerRoles.map((item) => (
              <div key={item.role} className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5">
                <h3 className="text-xl font-semibold">{item.role}</h3>
                <p className="mt-2 text-sm text-white/55">Skills: {item.skills.join(", ")}</p>
                <p className="mt-2 text-sm text-white/55">Projects: {item.projects.join(", ")}</p>
                <p className="mt-2 text-sm text-[#A3FF12]">Roadmap: {item.roadmap}</p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <h2 className="text-3xl font-semibold">Project Architecture Gallery</h2>
          {architectureGallery.map((item) => (
            <div key={item.name} className="mt-5 rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5">
              <h3 className="text-xl font-semibold">{item.name}</h3>
              <Info title="Folder Structure" text={item.folders.join(" / ")} />
              <Info title="Database Design" text={item.database.join(", ")} />
              <Info title="ER Diagram" text={item.er} />
              <Info title="API Design" text={item.apis.join(" | ")} />
              <Info title="Deployment Flow" text={item.deployment} />
            </div>
          ))}
        </Panel>
        <Panel>
          <h2 className="text-3xl font-semibold">Interview Experience Library</h2>
          {interviewExperiences.map((item) => (
            <div key={`${item.company}-${item.role}`} className="mt-5 rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5">
              <h3 className="text-xl font-semibold">{item.company} - {item.role}</h3>
              <p className="mt-2 text-sm text-white/55">Questions: {item.questions.join(", ")}</p>
              <p className="mt-2 text-sm text-[#A3FF12]">{item.difficulty}</p>
              <p className="mt-2 text-sm text-white/55">Lesson: {item.lesson}</p>
            </div>
          ))}
        </Panel>
        <Panel>
          <h2 className="text-3xl font-semibold">Tech Decision Lab</h2>
          {techDecisions.map((item) => (
            <div key={item.title} className="mt-5 rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5">
              <h3 className="text-xl font-semibold">{item.title}</h3>
              <Info title="Pros" text={item.pros.join(" | ")} />
              <Info title="Cons" text={item.cons.join(" | ")} />
              <Info title="Use Cases" text={item.useCases.join(" | ")} />
            </div>
          ))}
        </Panel>
        <Panel>
          <h2 className="text-3xl font-semibold">Developer Toolkit</h2>
          <div className="mt-5 grid gap-3">
            <textarea value={jsonText} onChange={(event) => setJsonText(event.target.value)} className="min-h-24 rounded-2xl border border-white/[0.08] bg-black/35 p-4 outline-none" />
            <div className="flex flex-wrap gap-2">
              <button onClick={formatJson} className="tool-button">Format JSON</button>
              <button onClick={testRegex} className="tool-button">Test Regex</button>
              <button onClick={generatePassword} className="tool-button">Password</button>
              <button onClick={() => setToolOutput(btoa(base64))} className="tool-button">Base64 Encode</button>
              <button onClick={formatSql} className="tool-button">SQL Format</button>
            </div>
            <input value={regex} onChange={(event) => setRegex(event.target.value)} className="min-h-11 rounded-2xl border border-white/[0.08] bg-black/35 px-4 outline-none" placeholder="Regex" />
            <input value={regexText} onChange={(event) => setRegexText(event.target.value)} className="min-h-11 rounded-2xl border border-white/[0.08] bg-black/35 px-4 outline-none" placeholder="Regex text" />
            <input value={base64} onChange={(event) => setBase64(event.target.value)} className="min-h-11 rounded-2xl border border-white/[0.08] bg-black/35 px-4 outline-none" placeholder="Base64 input" />
            <input value={sql} onChange={(event) => setSql(event.target.value)} className="min-h-11 rounded-2xl border border-white/[0.08] bg-black/35 px-4 outline-none" placeholder="SQL" />
            <input type="color" onChange={(event) => setToolOutput(event.target.value)} className="h-12 w-24 rounded-xl" />
            <textarea value={markdown} onChange={(event) => setMarkdown(event.target.value)} className="min-h-24 rounded-2xl border border-white/[0.08] bg-black/35 p-4 outline-none" />
            <div className="markdown-preview">{renderMarkdownPreview(markdown)}</div>
            <pre className="rounded-2xl bg-black/40 p-4 text-sm text-white/70">{toolOutput || password || "Tool output appears here."}</pre>
          </div>
        </Panel>
        <Panel>
          <h2 className="text-3xl font-semibold">Coding Pattern Visualizer</h2>
          <div className="pattern-map mt-5">
            {patternMaps.map((item) => (
              <div key={item.pattern} className="pattern-node">
                <strong>{item.pattern}</strong>
                <p>{item.connects.join(" -> ")}</p>
                <span>{item.example}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <h2 className="text-3xl font-semibold">Learning Heatmap</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={() => markToday("mcq")} className="tool-button">Log MCQ</button>
            <button onClick={() => markToday("question")} className="tool-button">Log Question</button>
            <button onClick={() => markToday("project")} className="tool-button">Log Project</button>
          </div>
          <div className="heatmap-grid mt-5">
            {activityDays.map((day) => <span key={day.key} title={`${day.key}: ${day.count}`} className={`heatmap-cell level-${Math.min(4, day.count)}`} />)}
          </div>
        </Panel>
        <Panel>
          <h2 className="text-3xl font-semibold">Placement War Room</h2>
          <InfoList title="Command Dashboard" items={["Roadmaps: choose one role and follow weekly plan", "Projects: build proof for your target role", "Companies: revise relevant topics", "Weak Areas: use skill decay tracker", "Communication: practice intro and HR answers", "Interview Readiness: portfolio + DSA + explanation quality"]} />
        </Panel>
        <Panel>
          <h2 className="text-3xl font-semibold">Rejection Recovery Center</h2>
          {rejectionReasons.map((item) => <Info key={item.reason} title={item.reason} text={item.fix} />)}
        </Panel>
        <Panel>
          <h2 className="text-3xl font-semibold">Soft Skills Center</h2>
          {softSkills.map((item) => <Info key={item.skill} title={item.skill} text={item.lesson} />)}
        </Panel>
      </section>
    </div>
  );
}

function parseRoadmapPhase(phase, index) {
  const cleaned = String(phase || "").trim();
  const match = cleaned.match(/^(Phase\s*\d+)\s*:\s*(.+)$/i);
  if (match) return { label: match[1], text: match[2] };
  return { label: `Phase ${index + 1}`, text: cleaned };
}

function RoadmapMiniSection({ title, items, type = "pills" }) {
  if (!items?.length) return null;
  return (
    <div className="roadmap-pack-section">
      <p>{title}</p>
      {type === "list" ? (
        <div className="roadmap-clean-list">
          {items.map((item) => <span key={item}>{item}</span>)}
        </div>
      ) : (
        <div className="roadmap-pill-list">
          {items.map((item) => <span key={item}>{item}</span>)}
        </div>
      )}
    </div>
  );
}

function Roadmaps({ token, requireLogin }) {
  const [roadmaps, setRoadmaps] = useState([]);

  async function load() {
    const data = await api("/roadmaps", { token });
    setRoadmaps(data.roadmaps);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(roadmap, step) {
    if (!token) return requireLogin("Roadmap progress saving is disabled in open mode. Roadmaps remain free to view.");
    const completedSteps = roadmap.progress.includes(step)
      ? roadmap.progress.filter((item) => item !== step)
      : [...roadmap.progress, step];
    await api(`/roadmaps/${roadmap.id}/steps`, { token, method: "POST", body: { completedSteps } });
    await api("/progress/last-viewed", { token, method: "POST", body: { roadmapId: roadmap.id } }).catch(() => null);
    await load();
  }

  return (
    <div>
      <HeroTitle
        eyebrow="Complete Tech Career Roadmaps (2026)"
        title="Detailed learning paths for every major tech role."
        copy="Each roadmap includes phases, YouTube resources, certifications, exams, real projects, and interview preparation guidance."
      />
      <div className="roadmap-pack-grid">
        {roadmaps.map((roadmap) => {
          const progress = roadmap.progress || [];
          const projectItems = roadmap.projectPlan?.length
            ? ["Build 3 beginner, 2 intermediate, and 1 advanced project before applying.", ...roadmap.projectPlan]
            : ["Build 3 beginner, 2 intermediate, and 1 advanced project before applying."];

          return (
            <article key={roadmap.id} className="roadmap-pack-card">
              <div className="roadmap-pack-header">
                <div>
                  <span>Career Roadmap</span>
                  <h2>{roadmap.title}</h2>
                </div>
                <strong>{roadmap.phases?.length || 3} phases</strong>
              </div>

              {roadmap.phases?.length ? (
                <div className="roadmap-pack-section">
                  <p>Learning path</p>
                  <div className="roadmap-phase-list">
                    {roadmap.phases.map((phase, index) => {
                      const parsed = parseRoadmapPhase(phase, index);
                      return (
                        <div key={phase} className="roadmap-phase-card">
                          <span>{parsed.label}</span>
                          <strong>{parsed.text}</strong>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <RoadmapMiniSection title="YouTube" items={roadmap.youtube || roadmap.whereToLearn?.filter((item) => item.type === "YouTube").map((item) => item.title)} />
              <RoadmapMiniSection title="Certifications" items={roadmap.certifications} />
              <RoadmapMiniSection title="Target Exams" items={roadmap.targetExams} />
              <RoadmapMiniSection title="Recommended Projects" items={projectItems} type="list" />
              {roadmap.interviewPrep ? <RoadmapMiniSection title="Interview Prep" items={[roadmap.interviewPrep]} type="list" /> : null}

              {roadmap.whereToLearn?.length ? (
                <div className="roadmap-pack-section">
                  <p>Where to learn</p>
                  <div className="roadmap-resource-grid">
                    {roadmap.whereToLearn.map((resource) => (
                      <a key={resource.url} href={resource.url} target="_blank" rel="noreferrer" className="roadmap-link-card">
                        <span>{resource.type}</span>
                        <strong>{resource.title}</strong>
                        <p>{resource.note}</p>
                        <ArrowUpRight size={15} />
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}

              {roadmap.certificateLinks?.length ? (
                <div className="roadmap-pack-section">
                  <p>Best certificates / courses</p>
                  <div className="roadmap-cert-grid">
                    {roadmap.certificateLinks.map((cert) => (
                      <a key={cert.url} href={cert.url} target="_blank" rel="noreferrer" className="cert-link-row">
                        <div>
                          <strong>{cert.title}</strong>
                          <p>{cert.level} - {cert.note}</p>
                        </div>
                        <ArrowUpRight size={16} />
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}

              {roadmap.weeklyPlan?.length ? (
                <RoadmapMiniSection title="Suggested Study Timeline" items={roadmap.weeklyPlan} type="list" />
              ) : null}

              {roadmap.steps?.length ? (
                <div className="roadmap-pack-section">
                  <p>Learning checkpoints</p>
                  <div className="roadmap-checkpoint-grid">
                    {roadmap.steps.map((step) => (
                      <button key={step} onClick={() => toggle(roadmap, step)} className={`roadmap-checkpoint ${progress.includes(step) ? "is-done" : ""}`}>
                        <span>{progress.includes(step) ? <Check size={14} /> : ""}</span>
                        {step}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Companies({ token }) {
  const [companies, setCompanies] = useState([]);
  const [selected, setSelected] = useState(null);
  const [companyItems, setCompanyItems] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    api("/companies", { token }).then((data) => setCompanies(data.companies)).catch((err) => setError(`Company API failed: ${err.message}`));
  }, []);

  async function openCompany(company) {
    try {
      setError("");
      const data = await api(`/companies/${company.id}`, { token });
      setSelected(data.company);
      setCompanyItems(data.items);
    } catch (err) {
      setError(`Company page failed: ${err.message}`);
    }
  }

  return (
    <div>
      <HeroTitle eyebrow="Company Hub" title="Company prep from database." copy="Process, eligibility, coding questions, HR and technical topics are API-backed." />
      <div className="mb-5 rounded-[1.5rem] border border-[#A3FF12]/20 bg-[#A3FF12]/10 p-5 text-sm leading-6 text-white/65">
        These company pages are preparation guides, not guaranteed current hiring papers. Verify role pages, official eligibility, campus rules, and recent experiences before interviews.
      </div>
      {error && <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-100">{error}</div>}
      <div className="grid gap-4 lg:grid-cols-2">
        {companies.map((company) => (
          <Panel key={company.id}>
            <h2 className="text-3xl font-semibold">{company.name}</h2>
            <p className="mt-3 text-[#A3FF12]">{company.salary}</p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <Info title="Eligibility" text={company.eligibility} />
              <Info title="Process" text={(company.hiringProcess || company.process || []).join(" -> ")} />
              <Info title="Questions" text={company.questions.join(", ")} />
              <Info title="MCQs" text="Topic-wise company tests ready" />
              <Info title="Reference" text={company.note || "Preparation reference. Actual rounds can vary."} />
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <InfoList title="Interview Stages" items={(company.interviewStages || []).slice(0, 4)} />
              <InfoList title="Preparation Tips" items={(company.preparationTips || []).slice(0, 4)} />
            </div>
            <button onClick={() => openCompany(company)} className="mt-5 rounded-full bg-[#A3FF12] px-5 py-2 font-semibold text-black">
              View Relevant Master Pack Items
            </button>
          </Panel>
        ))}
      </div>
      {selected && (
        <div className="mt-5">
          <HeroTitle eyebrow={`Inside ${selected.name}`} title={`${companyItems.length} relevant items`} copy="Filtered from the uploaded Interview Preparation Master Pack by company tags." />
          <Panel>
            <div className="grid gap-3 md:grid-cols-2">
              {companyItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <p className="text-sm text-[#A3FF12]">{item.type} - {item.difficulty}</p>
                  <h3 className="mt-2 font-semibold">{item.question}</h3>
                  <p className="mt-2 text-xs text-white/45">{item.topicTags?.join(", ")}</p>
                </div>
              ))}
              {!companyItems.length && <p className="text-white/45">No matching uploaded-pack items found for this company yet.</p>}
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}

function CompanyDetail({ token }) {
  const { id } = useParams();
  const [company, setCompany] = useState(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api(`/companies/${id}`, { token }).then((data) => {
      setCompany(data.company);
      setItems(data.items);
    }).catch((err) => setError(err.message));
  }, [id, token]);

  if (error) return <Panel>{error}</Panel>;
  if (!company) return <Panel>Loading company...</Panel>;

  return (
    <div>
      <HeroTitle eyebrow={`Inside ${company.name}`} title={`${items.length} relevant items`} copy="Company process and relevant Master Guide records from the database." />
      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Panel>
          <h2 className="text-3xl font-semibold">{company.name}</h2>
          <div className="mt-5 grid gap-3">
            <Info title="Eligibility" text={company.eligibility} />
            <Info title="Salary" text={company.salary} />
            <Info title="Process" text={(company.hiringProcess || company.process)?.join(" -> ")} />
            <Info title="Core Questions" text={company.questions?.join(", ")} />
            <InfoList title="Coding Questions" items={company.codingQuestions || []} />
            <InfoList title="HR Questions" items={company.hrQuestions || []} />
            <InfoList title="Preparation Tips" items={company.preparationTips || []} />
          </div>
        </Panel>
        <Panel>
          <div className="grid gap-3 md:grid-cols-2">
            {items.map((item) => (
              <ContentMiniCard key={item.id} item={item} requireLogin={() => null} />
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Leaderboard({ token }) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    api("/leaderboard", { token }).then((data) => setRows(data.leaderboard));
  }, []);
  return (
    <div>
      <HeroTitle eyebrow="Leaderboard" title="Calculated from XP, solved questions, and streak." copy="No fake ranks. This is queried from backend progress." />
      <Panel>
        <div className="space-y-3">
          {rows.length ? rows.map((row, index) => (
            <div key={row.username} className="grid grid-cols-[60px_1fr_auto_auto] gap-4 rounded-2xl bg-white/[0.04] p-4">
              <strong>#{index + 1}</strong>
              <span>{row.displayName} <span className="text-white/35">@{row.username}</span></span>
              <span className="text-[#A3FF12]">{row.xp} XP</span>
              <span className="text-white/45">{row.solvedCount} solved</span>
            </div>
          )) : <p className="text-white/45">No leaderboard data yet. Keep practicing; open-mode rankings will appear here when public progress tracking is added.</p>}
        </div>
      </Panel>
    </div>
  );
}

function SavedQuestions({ title, questions }) {
  return (
    <div>
      <HeroTitle eyebrow={title} title={title} copy="These rows come from your stored solved and bookmarked progress." />
      <Panel>
        {questions.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {questions.map((question) => (
              <div key={question.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                <p className="text-sm text-[#A3FF12]">{question.difficulty} - {question.topic || question.topicTags?.[0] || question.type || "General"}</p>
                <h3 className="mt-2 text-xl font-semibold">{question.title || question.question}</h3>
                <p className="mt-3 text-sm text-white/45">{(question.companies || question.companyTags || []).join(", ") || "General preparation"}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-white/45">Nothing saved yet. Solve or bookmark a question and it will appear here.</p>
        )}
      </Panel>
    </div>
  );
}

function AchievementsPage({ token }) {
  const [achievements, setAchievements] = useState([]);
  const [days, setDays] = useState([]);

  useEffect(() => {
    api("/achievements", { token }).then((data) => setAchievements(data.achievements));
    api("/streak/calendar", { token }).then((data) => setDays(data.days));
  }, [token]);

  return (
    <div>
      <HeroTitle eyebrow="Achievements" title={`${achievements.filter((item) => item.unlocked).length}/${achievements.length} unlocked`} copy="Badges and streak activity are calculated from real user progress." />
      <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <Panel>
          <div className="grid gap-3 md:grid-cols-2">
            {achievements.map((achievement) => (
              <div key={achievement.id} className={`rounded-2xl border p-4 ${achievement.unlocked ? "border-[#A3FF12]/40 bg-[#A3FF12]/10" : "border-white/[0.08] bg-white/[0.03]"}`}>
                <p className="text-sm text-[#A3FF12]">{achievement.unlocked ? "Unlocked" : "Locked"}</p>
                <h3 className="mt-2 font-semibold">{achievement.title}</h3>
                <p className="mt-2 text-sm text-white/45">{achievement.requirement}</p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <h2 className="text-2xl font-semibold">Streak Calendar</h2>
          <div className="mt-5 grid grid-cols-7 gap-2">
            {days.length ? days.slice(-35).map((day) => (
              <div key={day.date} title={`${day.date}: ${day.count} activities`} className="aspect-square rounded-lg bg-[#A3FF12]/20 p-1 text-[10px] text-[#A3FF12]">
                {day.count}
              </div>
            )) : <p className="col-span-7 text-white/45">No activity yet.</p>}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function AdminPanel({ token }) {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/admin/overview", { token }).then(setOverview).catch((err) => setError(err.message));
  }, [token]);

  if (error) return <Panel>{error}</Panel>;
  if (!overview) return <Panel>Loading admin overview...</Panel>;

  return (
    <div>
      <HeroTitle eyebrow="Admin Panel" title="Content Management System" copy="Protected overview of database counts, datasets, and recent users." />
      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(overview.counts).map(([key, value]) => (
          <Panel key={key}>
            <p className="text-sm capitalize text-white/45">{key}</p>
            <strong className="mt-2 block text-3xl">{value}</strong>
          </Panel>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="text-2xl font-semibold">Recent Users</h2>
          <div className="mt-4 space-y-2">
            {overview.recentUsers.map((user) => (
              <div key={user.id} className="rounded-2xl bg-white/[0.04] p-3">
                <strong>{user.displayName}</strong>
                <p className="text-sm text-white/45">@{user.username} - {user.email}</p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <h2 className="text-2xl font-semibold">Dataset Files</h2>
          <div className="mt-4 space-y-2">
            {Object.entries(overview.datasets.files).map(([file, count]) => (
              <div key={file} className="flex justify-between rounded-2xl bg-white/[0.04] p-3 text-sm">
                <span>{file}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Profile({ session, token, onChange }) {
  const { user, stats } = session;
  const [form, setForm] = useState({
    displayName: user.displayName || "",
    username: user.username || "",
    profilePicture: user.profilePicture || "",
    bio: user.bio || "",
    college: user.college || "",
    skills: (user.skills || []).join(", "),
    github: user.socialLinks?.github || "",
    linkedin: user.socialLinks?.linkedin || "",
    portfolio: user.socialLinks?.portfolio || "",
  });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await api("/me", {
        token,
        method: "PATCH",
        body: {
          displayName: form.displayName,
          username: form.username,
          profilePicture: form.profilePicture,
          bio: form.bio,
          college: form.college,
          skills: form.skills,
          socialLinks: {
            github: form.github,
            linkedin: form.linkedin,
            portfolio: form.portfolio,
          },
        },
      });
      await onChange();
      setMessage("Profile saved.");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <HeroTitle eyebrow="Profile" title={user.displayName} copy={`@${user.username}`} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Panel><p className="text-white/45">Email</p><strong>{user.email}</strong></Panel>
        <Panel><p className="text-white/45">Level</p><strong>{user.level}</strong></Panel>
        <Panel><p className="text-white/45">Current Streak</p><strong>{user.currentStreak}</strong></Panel>
        <Panel><p className="text-white/45">Bookmarks</p><strong>{stats.bookmarkCount}</strong></Panel>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
        <Panel>
          <Avatar user={{ ...user, profilePicture: form.profilePicture }} size="large" />
          <h2 className="mt-5 text-2xl font-semibold">{form.displayName || user.displayName}</h2>
          <p className="text-white/45">@{form.username || user.username}</p>
          <p className="mt-5 text-sm leading-6 text-white/55">{form.bio || "Add a short bio so your profile feels personal."}</p>
        </Panel>
        <Panel>
          <h2 className="text-2xl font-semibold">Edit Profile</h2>
          {message && <p className="mt-4 rounded-2xl bg-white/[0.05] p-3 text-sm text-white/70">{message}</p>}
          <form onSubmit={saveProfile} className="mt-5 grid gap-4 md:grid-cols-2">
            <Input label="Display Name" value={form.displayName} onChange={(displayName) => setForm({ ...form, displayName })} />
            <Input label="Username" value={form.username} onChange={(username) => setForm({ ...form, username })} />
            <Input label="Profile Picture URL" value={form.profilePicture} onChange={(profilePicture) => setForm({ ...form, profilePicture })} />
            <Input label="College" value={form.college} onChange={(college) => setForm({ ...form, college })} />
            <Input label="Skills (comma separated)" value={form.skills} onChange={(skills) => setForm({ ...form, skills })} />
            <Input label="GitHub" value={form.github} onChange={(github) => setForm({ ...form, github })} />
            <Input label="LinkedIn" value={form.linkedin} onChange={(linkedin) => setForm({ ...form, linkedin })} />
            <Input label="Portfolio" value={form.portfolio} onChange={(portfolio) => setForm({ ...form, portfolio })} />
            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm text-white/45">Bio</span>
              <textarea value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} className="min-h-28 w-full rounded-2xl border border-white/[0.08] bg-black/35 p-4 outline-none focus:border-[#A3FF12]/60" />
            </label>
            <button disabled={saving} className="rounded-full bg-[#A3FF12] px-5 py-3 font-semibold text-black disabled:opacity-60">
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </Panel>
      </div>
    </div>
  );
}

function SettingsPage({ token, logout }) {
  const [confirmText, setConfirmText] = useState("");
  const [message, setMessage] = useState("");

  async function deleteAccount() {
    if (confirmText !== "DELETE") {
      setMessage("Type DELETE to confirm account deletion.");
      return;
    }
    await api("/me", { token, method: "DELETE" });
    await logout();
  }

  return (
    <div>
      <HeroTitle eyebrow="Settings" title="Account Settings" copy="Manage session and permanent account deletion." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="text-2xl font-semibold">Session</h2>
          <p className="mt-3 text-white/55">Refresh tokens are stored in an HTTP-only cookie. You stay logged in until logout or account deletion.</p>
          <button onClick={logout} className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/[0.1] px-5 py-3 text-white/75">
            <LogOut size={16} /> Logout
          </button>
        </Panel>
        <Panel>
          <h2 className="text-2xl font-semibold text-red-100">Delete Account</h2>
          <p className="mt-3 text-white/55">This permanently removes profile, progress, bookmarks, notes, roadmap progress, quiz results, and saved data.</p>
          {message && <p className="mt-4 rounded-2xl bg-red-500/10 p-3 text-sm text-red-100">{message}</p>}
          <Input label="Type DELETE to confirm" value={confirmText} onChange={setConfirmText} />
          <button onClick={deleteAccount} className="mt-4 rounded-full bg-red-500 px-5 py-3 font-semibold text-white">
            Delete my account
          </button>
        </Panel>
      </div>
    </div>
  );
}

function HeroTitle({ eyebrow, title, copy }) {
  return (
    <section className="hero-title relative mb-8 overflow-hidden rounded-[2rem] border border-white/[0.06] bg-white/[0.025] p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(163,255,18,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(102,217,239,0.10),transparent_24%)]" />
      <div className="relative">
      <p className="text-sm font-medium uppercase tracking-[0.35em] text-[#A3FF12]">{eyebrow}</p>
      <h1 className="mt-4 font-display text-5xl font-semibold tracking-[-0.06em] md:text-7xl">{title}</h1>
      <p className="mt-4 max-w-3xl text-white/55">{copy}</p>
      </div>
    </section>
  );
}

function Panel({ children }) {
  return (
    <div className="glass-panel scanline rounded-[2rem] border border-white/[0.08] bg-[#0E0E0E]/78 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      {children}
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-white/45">{label}</span>
      <input value={value} type={type} onChange={(event) => onChange(event.target.value)} className="min-h-12 w-full rounded-2xl border border-white/[0.08] bg-black/40 px-4 outline-none transition focus:border-[#A3FF12]/70 focus:bg-black/55 focus:shadow-[0_0_0_4px_rgba(163,255,18,0.08)]" />
    </label>
  );
}

function Avatar({ user, size = "normal" }) {
  const dimension = size === "large" ? "h-24 w-24" : "h-10 w-10";
  if (user?.profilePicture) {
    return <img src={user.profilePicture} alt={user.displayName || "Profile"} className={`${dimension} rounded-full border border-white/[0.1] object-cover`} />;
  }
  return (
    <span className={`${dimension} grid place-items-center rounded-full border border-[#A3FF12]/30 bg-[#A3FF12]/10 font-semibold text-[#A3FF12]`}>
      {(user?.displayName || user?.username || "U").slice(0, 1).toUpperCase()}
    </span>
  );
}

function Splash() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#050505] text-white">
      <div className="glass-panel rounded-[2rem] border border-white/[0.08] bg-[#0E0E0E]/80 p-10 text-center">
        <img src={logoUrl} alt="SJ DEVS logo" className="mx-auto h-16 w-52 object-contain" />
        <p className="mt-6 text-sm uppercase tracking-[0.3em] text-[#A3FF12]">Restoring secure session</p>
      </div>
    </main>
  );
}

function ActionButton({ children, icon: Icon, active, onClick }) {
  return (
    <button onClick={onClick} className={`magnetic-button inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${active ? "neon-ring bg-[#A3FF12] text-black" : "border border-white/[0.1] bg-white/[0.04] text-white/75"}`}>
      <Icon size={16} /> {children}
    </button>
  );
}

function Info({ title, text }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <p className="text-sm text-white/35">{title}</p>
      <p className="mt-2 text-white/70">{text}</p>
    </div>
  );
}

function ReferenceNotice() {
  return (
    <footer className="reference-footer mt-10 border-t border-white/[0.08] bg-[#050505] px-5 py-8 text-white md:px-10">
      <div className="mx-auto max-w-[1440px]">
        <div className="reference-card rounded-[1.5rem] border border-white/[0.08] bg-[#0E0E0E] p-5">
          <div className="footer-brand-row flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="footer-kicker text-sm font-semibold uppercase tracking-[0.22em] text-[#A3FF12]">CrackIT by SJ DEVS</p>
              <h2 className="footer-brand-title mt-2 font-display text-3xl font-semibold tracking-[-0.04em]">Think. Code. Build. Crack.</h2>
              <p className="footer-founder mt-2 text-sm text-white/55">Built by SJ DEVS. Contact: <a href="mailto:sjdevs17@gmail.com" className="footer-email">sjdevs17@gmail.com</a></p>
              <p className="footer-dev-note mt-2 text-sm font-semibold">Updated continuously with richer questions, quizzes, roadmaps, and project blueprints.</p>
            </div>
            <a href={instagramUrl} target="_blank" rel="noreferrer" className="footer-link inline-flex w-fit items-center gap-2 rounded-full border border-white/[0.1] px-4 py-2 text-sm text-white/65 hover:border-[#A3FF12]/40 hover:text-[#A3FF12]">
              <Instagram size={15} /> Follow SJ DEVS on Instagram
            </a>
          </div>
          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.22em] text-white/35">Reference Platform Notice</p>
          <p className="footer-copy mt-3 max-w-5xl text-sm leading-7 text-white/55">
            CrackIT is designed as a learning and reference resource. While we provide curated technical content,
            interview topics, and career guidance, users should not rely entirely on this platform. Always verify
            information, build practical projects, explore official documentation, and use this website as a
            supplementary learning resource.
          </p>
          <p className="footer-copy-muted mt-3 text-sm text-white/45">CrackIT is completely free and open source for students. No login, no signup, no payment, no forced follow. Following SJ DEVS is appreciated, never required.</p>
        </div>
      </div>
    </footer>
  );
}

export default App;
