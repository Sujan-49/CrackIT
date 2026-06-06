import { readFileSync } from "node:fs";

const API = process.env.AUDIT_API_URL || "http://127.0.0.1:4000/api";

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { status: response.status, data, headers: response.headers };
}

function localCounts() {
  const db = JSON.parse(readFileSync("data/store.json", "utf8"));
  return {
    users: db.users?.length || 0,
    contentItems: db.contentItems?.length || 0,
    questions: db.questions?.length || 0,
    mcqs: db.mcqs?.length || 0,
    companies: db.companies?.length || 0,
    roadmaps: db.roadmaps?.length || 0,
    progress: (db.progress?.length || 0) + (db.contentProgress?.length || 0),
    notes: db.notes?.length || 0,
    mcqResults: db.mcqResults?.length || 0,
  };
}

function localDb() {
  return JSON.parse(readFileSync("data/store.json", "utf8"));
}

function localMcqs() {
  const db = localDb();
  const datasetMcqs = (db.contentItems || [])
    .filter((item) => item.type === "MCQ" && Array.isArray(item.options) && item.options.length)
    .map((item) => ({ id: item.id }));
  const seededMcqs = (db.mcqs || []).map((item) => ({ id: item.id }));
  const seen = new Set();
  return [...datasetMcqs, ...seededMcqs].filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

const suffix = Date.now();
const email = `audit${suffix}@example.com`;
const username = `audit${suffix}`;

const report = {
  checkedAt: new Date().toISOString(),
  api: API,
  localCounts: localCounts(),
  checks: {},
};

const status = await request("/status");
report.checks.status = {
  status: status.status,
  database: status.data?.database,
  mongoConfigured: status.data?.mongoConfigured,
  mongoConnected: status.data?.mongoConnected,
  googleOAuthConfigured: status.data?.googleOAuthConfigured,
};

const content = await request("/content/dsa-easy-two-sum-1");
report.checks.contentDetail = {
  status: content.status,
  question: content.data?.item?.question,
};

const lockedList = await request("/content?page=5&limit=100");
const lockedItemId = lockedList.data?.items?.find((item) => item.locked)?.id;
const lockedContent = lockedItemId ? await request(`/content/${lockedItemId}`) : { status: 0, data: null };
report.checks.guestContentLock = {
  listStatus: lockedList.status,
  lockedItemId,
  detailStatus: lockedContent.status,
  locked: Boolean(lockedContent.data?.locked),
};

const mcqs = await request("/mcqs");
const mcqId = mcqs.data?.mcqs?.[0]?.id;
const mcq = mcqId ? await request(`/mcqs/${mcqId}`) : { status: 0, data: null };
const localMcqBank = localMcqs();
const hiddenMcqId = localMcqBank[Math.ceil(localMcqBank.length * 0.35) + 1]?.id;
const lockedMcq = hiddenMcqId ? await request(`/mcqs/${hiddenMcqId}`) : { status: 0, data: null };
report.checks.mcqDetail = {
  listStatus: mcqs.status,
  detailStatus: mcq.status,
  visibleCount: mcqs.data?.mcqs?.length || 0,
  firstOptions: mcq.data?.mcq?.options?.length || 0,
};
report.checks.guestMcqLock = {
  hiddenMcqId,
  detailStatus: lockedMcq.status,
  locked: Boolean(lockedMcq.data?.locked),
};

const register = await request("/auth/register", {
  method: "POST",
  body: JSON.stringify({
    name: "Audit User",
    username,
    email,
    password: "Password123",
    confirmPassword: "Password123",
  }),
});
const token = register.data?.token;
const refreshCookie = register.headers.get("set-cookie")?.split(";")[0] || "";
report.checks.register = {
  status: register.status,
  username: register.data?.user?.username,
  role: register.data?.user?.role,
  hasToken: Boolean(token),
  hasRefreshCookie: Boolean(refreshCookie),
};

if (token) {
  const refresh = await request("/auth/refresh", {
    method: "POST",
    headers: refreshCookie ? { Cookie: refreshCookie } : {},
  });
  const dashboard = await request("/dashboard", {
    headers: { Authorization: `Bearer ${refresh.data?.token || token}` },
  });
  const solved = await request("/content/dsa-easy-two-sum-1/solved", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ solved: true }),
  });
  const note = await request("/content/dsa-easy-two-sum-1/notes", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ text: "audit note" }),
  });
  const admin = await request("/admin/overview", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const achievements = await request("/achievements", {
    headers: { Authorization: `Bearer ${token}` },
  });
  report.checks.datasetProgress = {
    solvedStatus: solved.status,
    solved: solved.data?.progress?.solved,
    noteStatus: note.status,
    note: note.data?.note?.text,
  };
  report.checks.persistentSession = {
    refreshStatus: refresh.status,
    hasNewToken: Boolean(refresh.data?.token),
    dashboardStatus: dashboard.status,
    dashboardUser: dashboard.data?.user?.username,
  };
  report.checks.adminProtection = {
    status: admin.status,
    expectedForStudent: 403,
  };
  report.checks.achievements = {
    status: achievements.status,
    count: achievements.data?.achievements?.length || 0,
  };
}

console.log(JSON.stringify(report, null, 2));
