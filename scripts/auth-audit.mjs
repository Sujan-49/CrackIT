import { readFileSync } from "node:fs";

const API = process.env.AUTH_AUDIT_API_URL || "http://127.0.0.1:4000/api";
const stamp = Date.now();
const user = {
  name: "Auth Audit User",
  username: `authaudit${stamp}`,
  email: `authaudit${stamp}@example.com`,
  password: "Password123",
  confirmPassword: "Password123",
};

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body,
    });
  } catch (err) {
    return { status: 0, data: { error: err.message, networkError: true }, headers: new Headers() };
  }
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { status: response.status, data, headers: response.headers };
}

function storedUser(email) {
  const db = JSON.parse(readFileSync("data/store.json", "utf8"));
  return db.users?.find((item) => item.email === email) || null;
}

const report = {
  checkedAt: new Date().toISOString(),
  api: API,
  checks: {},
};

const status = await request("/status");
report.checks.backend = {
  status: status.status,
  ok: status.data?.ok === true,
  reachable: status.status > 0,
  error: status.data?.error || "",
  database: status.data?.database,
  mongoConfigured: status.data?.mongoConfigured,
  mongoConnected: status.data?.mongoConnected,
  googleOAuthConfigured: status.data?.googleOAuthConfigured,
  usersBefore: status.data?.users,
};

if (!report.checks.backend.reachable) {
  report.rootCause = "Backend is not reachable. Start it with npm.cmd run api or npm.cmd run start:local.";
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}

const google = await request("/auth/google/url");
report.checks.googleOAuth = {
  status: google.status,
  configured: status.data?.googleOAuthConfigured === true,
  error: google.data?.error || "",
};

const register = await request("/auth/register", { method: "POST", body: user });
const registerCookie = register.headers.get("set-cookie")?.split(";")[0] || "";
const registeredUser = storedUser(user.email);
report.checks.signup = {
  status: register.status,
  created: register.status === 200,
  hasAccessToken: Boolean(register.data?.token),
  hasRefreshCookie: Boolean(registerCookie),
  storedInDatabase: Boolean(registeredUser),
  passwordHashed: Boolean(registeredUser?.passwordHash && registeredUser.passwordHash !== user.password),
  username: register.data?.user?.username,
};

const meAfterSignup = register.data?.token
  ? await request("/me", { headers: { Authorization: `Bearer ${register.data.token}` } })
  : { status: 0, data: null };
report.checks.profileAfterSignup = {
  status: meAfterSignup.status,
  email: meAfterSignup.data?.user?.email,
};

const refresh = registerCookie
  ? await request("/auth/refresh", { method: "POST", headers: { Cookie: registerCookie } })
  : { status: 0, data: null };
report.checks.refreshSession = {
  status: refresh.status,
  hasNewAccessToken: Boolean(refresh.data?.token),
  user: refresh.data?.user?.username,
};

const login = await request("/auth/login", {
  method: "POST",
  body: { email: user.email, password: user.password },
});
const loginCookie = login.headers.get("set-cookie")?.split(";")[0] || "";
report.checks.login = {
  status: login.status,
  validCredentialsAccepted: login.status === 200,
  hasAccessToken: Boolean(login.data?.token),
  hasRefreshCookie: Boolean(loginCookie),
};

const dashboard = login.data?.token
  ? await request("/dashboard", { headers: { Authorization: `Bearer ${login.data.token}` } })
  : { status: 0, data: null };
report.checks.dashboard = {
  status: dashboard.status,
  profileLoaded: dashboard.data?.user?.email === user.email,
};

const logout = login.data?.token
  ? await request("/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${login.data.token}` } })
  : { status: 0, data: null };
report.checks.logout = {
  status: logout.status,
  ok: logout.data?.ok === true,
};

const refreshAfterLogout = loginCookie
  ? await request("/auth/refresh", { method: "POST", headers: { Cookie: loginCookie } })
  : { status: 0, data: null };
report.checks.refreshAfterLogout = {
  status: refreshAfterLogout.status,
  rejected: refreshAfterLogout.status === 401,
};

console.log(JSON.stringify(report, null, 2));
