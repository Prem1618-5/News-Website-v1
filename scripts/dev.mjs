#!/usr/bin/env node
/**
 * Local development runner.
 *
 * Starts the three deployables as separate processes, the same way they run in production:
 *   - Platform API  (FastAPI)      http://localhost:8000
 *   - Newsroom      (Vite, React)  http://localhost:5174/newsroom/
 *   - Reader        (Vite)         http://localhost:3000   <- open this one
 *
 * The reader dev server proxies /api, /images and /newsroom so the whole product is
 * reachable from one URL during development. Each process is supervised on its own:
 * if one crashes, the others keep running, which mirrors the decoupled production setup.
 *
 * Usage: node scripts/dev.mjs [api|reader|newsroom ...]
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = join(root, "apps", "api");
const isWin = process.platform === "win32";
const venvPython = join(apiDir, ".venv", isWin ? "Scripts" : "bin", isWin ? "python.exe" : "python");

const requested = new Set(process.argv.slice(2));
const wants = (name) => requested.size === 0 || requested.has(name);

const COLORS = { api: "\x1b[35m", reader: "\x1b[36m", newsroom: "\x1b[33m" };
const reset = "\x1b[0m";

function prefix(name, chunk) {
  const lines = chunk.toString().split("\n").filter(Boolean);
  for (const line of lines) process.stdout.write(`${COLORS[name] ?? ""}[${name}]${reset} ${line}\n`);
}

function ensurePythonEnv() {
  if (existsSync(venvPython)) {
    const probe = spawnSync(venvPython, ["-c", "import fastapi, sqlmodel, uvicorn"], { stdio: "ignore" });
    if (probe.status === 0) return venvPython;
  }
  const sysPython = isWin ? "python" : "python3";
  const probeSys = spawnSync(sysPython, ["-c", "import fastapi, sqlmodel, uvicorn"], { stdio: "ignore" });
  if (probeSys.status === 0) return sysPython;

  prefix("api", "Setting up Python environment (first run only)...");
  const hasUv = spawnSync("uv", ["--version"], { stdio: "ignore" }).status === 0;
  if (hasUv) {
    spawnSync("uv", ["venv", "-q", ".venv"], { cwd: apiDir, stdio: "inherit" });
    spawnSync("uv", ["pip", "install", "-q", "--python", venvPython, "-r", "requirements.txt"], { cwd: apiDir, stdio: "inherit" });
  } else {
    spawnSync(sysPython, ["-m", "venv", ".venv"], { cwd: apiDir, stdio: "inherit" });
    spawnSync(venvPython, ["-m", "pip", "install", "-q", "-r", "requirements.txt"], { cwd: apiDir, stdio: "inherit" });
  }
  return existsSync(venvPython) ? venvPython : sysPython;
}

function supervise(name, command, args, options) {
  let restarts = 0;
  const start = () => {
    const child = spawn(command, args, { shell: isWin, ...options, env: { ...process.env, ...options.env }, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.on("data", (c) => prefix(name, c));
    child.stderr.on("data", (c) => prefix(name, c));
    child.on("exit", (code) => {
      if (shuttingDown) return;
      prefix(name, `exited with code ${code}. Other apps keep running.`);
      if (restarts < 5) {
        restarts += 1;
        setTimeout(start, 1500 * restarts);
      }
    });
    children.push(child);
  };
  start();
}

const children = [];
let shuttingDown = false;
const shutdown = () => {
  shuttingDown = true;
  for (const c of children) c.kill("SIGTERM");
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

if (wants("api")) {
  const python = ensurePythonEnv();
  supervise("api", python, ["-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--reload-dir", "app"], {
    cwd: apiDir,
    env: { APP_ENV: "development", PYTHONUNBUFFERED: "1" },
  });
}

if (wants("newsroom")) {
  supervise("newsroom", "pnpm", ["--filter", "@news/newsroom", "dev"], { cwd: root, env: {} });
}

if (wants("reader")) {
  supervise("reader", "pnpm", ["--filter", "@news/reader", "dev"], { cwd: root, env: {} });
}
