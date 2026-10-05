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

function run(cwd, bin, args, env = {}) {
  const local = join(cwd, "node_modules", ".bin", bin);
  const command = existsSync(local) ? local : bin;
  console.log(`> ${bin} ${args.join(" ")}  (${cwd.replace(root, ".")})`);
  const result = spawnSync(command, args, { cwd, stdio: "inherit", env: { ...process.env, ...env } });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const reader = join(root, "apps", "reader");
const newsroom = join(root, "apps", "newsroom");

run(reader, "vite", ["build"]);
run(newsroom, "tsc", ["--noEmit"]);
run(newsroom, "vite", ["build"], { NEWSROOM_BASE: "/newsroom/" });

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(reader, "dist"), out, { recursive: true });
cpSync(join(newsroom, "dist"), join(out, "newsroom"), { recursive: true });
console.log("Static output written to dist/");
