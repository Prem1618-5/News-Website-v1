# Project notes (read this instead of exploring the repo)

pnpm monorepo for a bilingual (EN/HI) news product. Do not re-discover this layout:

| Path | What it is |
|---|---|
| `apps/api` | FastAPI + SQLModel. `app/routers/` (HTTP), `app/services/` (publish, doc cleaning, content packs, email), `app/models.py`, `tests/` (pytest). Article packs in `content/`. |
| `apps/reader` | React + Vite public site, prerendered for SEO (`scripts/prerender.mjs`). |
| `apps/newsroom` | React + Vite staff PWA (reporter/editor workflow). Served at `/` on its own host. |
| `packages/contracts` | Shared places, coverage levels and enums (`contracts.json`, `src/index.ts`). |

Commands: `pnpm test` (newsroom + reader), `pnpm test:api`, `pnpm typecheck`, `pnpm build`, `pnpm dev`. Windows machine; Bash and PowerShell both work.

## Saving tokens in this repo

1. **Graph first.** Use `graphify query / explain / path` (see the graphify section below) before any grep, glob or file read. It returns file paths and line numbers, so then read only that range with `Read` `offset`/`limit`.
2. **Never read whole** these large or generated files: `pnpm-lock.yaml`, `graphify-out/graph.json`, `graphify-out/graph.html`, `dist/`, `node_modules/`, `apps/api/content/` (article packs), `apps/reader/public/*.png`. Big source files (`apps/newsroom/src/features/compose/ComposePage.tsx`, `apps/api/app/routers/desk.py`, `apps/newsroom/src/features/editor/StoryEditor.tsx`) only by line range.
3. **Docs are not startup reading.** `docs/PROJECT_CONTEXT.md` (architecture, env vars, known issues), `DEPLOYMENT.md`, `SEO.md`, `PROGRESS.md` are long. Open one only when the task is about that topic, and `grep` the heading you need.
4. **Do not re-verify what is recorded.** If the graph or this file answers it, do not re-read the code to confirm. Read code only to change it.
5. **Keep output small.** Pipe test, build and git output through `tail` or `head`; use `git diff --stat` before a full diff.
6. **Subagents:** give each one the rule in point 1, or they will re-read the repo from scratch.
7. **Keep the graph fresh.** After code changes run `graphify update .` (local, free). Git hooks do this on commit, checkout, merge and rewrite. If `GRAPH_REPORT.md` says "Built from commit" and it differs from `git rev-parse HEAD`, run it before trusting the graph.
8. The graph covers code only (no markdown, no JSON). For docs, use `grep -n` on headings.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
