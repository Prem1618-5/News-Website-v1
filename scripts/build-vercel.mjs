#!/usr/bin/env node
/**
 * Single-project Vercel build: Reader at `/`, Newsroom at `/newsroom/`, Platform API as a
 * Python function behind `/api` and `/images` (see vercel.json). Static output goes to `dist/`.
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "dist");

const isWin = process.platform === "win32";

function run(args, env = {}) {
  const pnpmCmd = isWin ? "pnpm.cmd" : "pnpm";
  console.log(`> pnpm ${args.join(" ")}`);
  const result = spawnSync(pnpmCmd, args, { cwd: root, shell: isWin, stdio: "inherit", env: { ...process.env, ...env } });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const readerDist = join(root, "apps", "reader", "dist");
const newsroomDist = join(root, "apps", "newsroom", "dist");

run(["--filter", "@news/reader", "build"]);
run(["--filter", "@news/newsroom", "build"], { NEWSROOM_BASE: "/newsroom/" });

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(readerDist, out, { recursive: true });
cpSync(newsroomDist, join(out, "newsroom"), { recursive: true });
console.log("Static output written to dist/");
