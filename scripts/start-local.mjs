import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const cwd = process.cwd();
const isWindows = process.platform === "win32";
const viteBin = join(cwd, "node_modules", ".bin", isWindows ? "vite.cmd" : "vite");

if (!existsSync(viteBin)) {
  console.error("Vite binary not found. Run npm.cmd install first.");
  process.exit(1);
}

function run(name, command, args) {
  const child = spawn(command, args, {
    cwd,
    stdio: "inherit",
    shell: isWindows && command.toLowerCase().endsWith(".cmd"),
    env: childEnv(),
  });
  child.on("exit", (code) => {
    if (code && !shuttingDown) {
      console.error(`${name} exited with code ${code}`);
      shutdown(code);
    }
  });
  return child;
}

function childEnv() {
  const env = {};
  const seen = new Set();
  for (const [key, value] of Object.entries(process.env)) {
    const normalized = isWindows ? key.toLowerCase() : key;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    env[key] = value;
  }
  env.VITE_API_URL = process.env.VITE_API_URL || "http://127.0.0.1:4000/api";
  return env;
}

let shuttingDown = false;
const api = run("API", process.execPath, ["server.js"]);
const web = run("Vite", viteBin, ["--host", "127.0.0.1", "--port", "5173"]);

function shutdown(code = 0) {
  shuttingDown = true;
  for (const child of [api, web]) {
    if (!child.killed) child.kill();
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

console.log("CrackIT local stack starting:");
console.log("Frontend: http://127.0.0.1:5173");
console.log("Backend:  http://127.0.0.1:4000/api/status");
