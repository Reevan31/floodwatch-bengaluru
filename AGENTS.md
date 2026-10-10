# AGENTS.md — Multi-Agent Coordination Protocol

> Agents: **Kilo Code**, **OpenCode**, **Cline** (VS Code). Each agent MUST read this file at the start of every task and re-read it before claiming new work.

---

## 1. PROJECT CONTEXT

- **Project:** FloodWatch Bengaluru
- **Goal:** A mobile-first, community-powered flood reporting platform for Bengaluru that lets residents report, verify, discover, and monitor localized flooding and severe waterlogging in near real time. Evidence-first, privacy-by-design, and never presented as an emergency dispatch service.
- **Stack:** Vite 6 + TypeScript (strict) with a vanilla DOM/CSS frontend, deployed to **Cloudflare Pages via Wrangler**. Target stack per the master brief: an interactive map (Leaflet/MapLibre), a spatial backend (PostgreSQL + PostGIS, e.g. Supabase) with Row-Level Security, evidence object storage with image sanitization, community verification + freshness model, notifications, admin/moderation tooling, and automated tests.
- **Commands:** install `pnpm install` · dev `pnpm dev` (port 3000) · test `pnpm test` (⚠ not configured yet — T-003) · lint `pnpm lint` (⚠ not configured yet — T-003) · build `pnpm build` (= `tsc --noEmit && vite build`)
- **Definition of done (every task):** `pnpm build` passes (strict `tsc`), lint + tests pass once configured, no unrelated files touched, log updated.
- **Requirements source of truth:** the FloodWatch master build brief (Phases 1–10). A formal, versioned `SPEC.md` derived from that brief is **pending — tracked as T-001**.

## 2. AGENT ROLES & OWNERSHIP MAP

Each path has exactly ONE owner. An agent edits only files it owns or has **locked** (Section 5). Reading is always allowed.

| Agent | Role | Owns (write) | Never touches |
|---|---|---|---|
| **Kilo Code** | Frontend/UI & map | `src/**`, `public/**` (UI assets) | `supabase/**`, `db/**`, `backend/**`, `COORDINATION/**`, `package.json`, lockfiles, `tsconfig.json`, `.env*`, CI config |
| **OpenCode** | Backend/API/DB/infra | `supabase/**`, `db/**`, `backend/**`, `.github/workflows/**` | `src/**`, `public/**` (UI), `COORDINATION/**` |
| **Cline** | Tests, docs, tooling, review, deployment | `tests/**`, `docs/**`, `COORDINATION/**`, `.github/**`, deploy config (`wrangler`, `_headers`, hosting docs) | `src/**`, `public/**` (propose via handoff only), `package.json`, lockfiles, `tsconfig.json`, `.env*` |
| **Human** | Owner/approver | Everything | — |

**Human-only files** (request changes via HANDOFFS.md, never edit): `package.json`, lockfiles (`pnpm-lock.yaml`), `.env*`, `tsconfig.json`, CI config, DB schema root, this file.

## 3. GOLDEN RULES (all agents)

1. **One task, one owner, one branch.** Work only on tasks assigned or claimed in `COORDINATION/TASKS.md`.
2. **Claim before you edit.** No lock = no edit outside your ownership.
3. **Stay in your lane.** Need a fix in someone else's file? File a handoff, don't "just fix it".
4. **Small commits on your own branch** `agent/{{name}}`, format `[{{agent}}] {{scope}}: {{what}}`. Never commit to `main`, never force-push, never rewrite others' history.
5. **Rebase before starting and finishing:** `git fetch && git rebase origin/main`. Resolve conflicts only in files you own; otherwise stop and hand off.
6. **No scope creep:** no refactors, renames, repo-wide formatting, or dependency upgrades unless the task says so.
7. **No destructive commands** (`rm -rf`, `git reset --hard`, `git clean`, DB drops, migrations on shared data) without a human-approved line in the task.
8. **Use only your assigned port/DB/temp dir** (Section 6). Never kill processes you didn't start.
9. **Never invent contracts.** Read `CONTRACTS.md`; if missing or ambiguous, hand off and switch tasks.
10. **If unsure, stop and log it.** If rules conflict, or a task contradicts this file, **flag the conflict in the log and ask the human; do not silently resolve it.**
11. **Never print, log, or commit secrets.**
12. **Leave the tree clean** when done: no stray files, debug code, or uncommitted changes.

## 4. COORDINATION FOLDER

```
COORDINATION/
  TASKS.md       # backlog + status board
  LOCKS.md       # active file/dir locks
  HANDOFFS.md    # cross-agent requests
  CONTRACTS.md   # agreed APIs, types, schemas, env var names
  LOG.md         # append-only activity log
  DECISIONS.md   # architecture decisions (what, why, who approved)
```

Write discipline: append-only where possible, edit only your own rows, one line per entry with timestamp + agent name, and re-read the file right before writing.

## 5. LOCKING PROTOCOL (`COORDINATION/LOCKS.md`)

```
| Path or glob        | Agent    | Task | Locked at (UTC)      | Expires (UTC)        | Mode      |
|---------------------|----------|------|----------------------|----------------------|-----------|
| {{src/api/auth/**}} | opencode | T-004| {{2026-01-01 10:00}} | {{2026-01-01 11:00}} | exclusive |
```

1. **Check** for overlapping, unexpired locks. If found, don't edit; pick another task or hand off.
2. **Acquire:** add your row (default expiry 60 min); push it if using worktrees.
3. **Work** only inside locked paths.
4. **Release:** remove your row as the last step of the task.
5. **Stale locks:** ignore a lock only after it has expired, and log a note first.
6. Modes: `exclusive` (default) or `read-shared`.

> Locks are advisory. Git worktrees (Section 0 setup) are what make collisions physically impossible.

## 6. RESOURCES (avoid runtime collisions)

| Resource | Kilo Code | OpenCode | Cline |
|---|---|---|---|
| Dev port | 3001 | 3002 | 3003 |
| Database/schema | kilo_dev | opencode_dev | cline_test |
| Temp dir | `.tmp/kilo/` | `.tmp/opencode/` | `.tmp/cline/` |
| Branch | `agent/kilo` | `agent/opencode` | `agent/cline` |

- **Shared port note:** the project's own dev server uses **port 3000** (`vite.config.ts`, `strictPort`). Do **not** run an agent dev server on 3000 — use your assigned agent port (3001/3002/3003).
- **Rate-limited or paid external services:** Cloudflare deploys (`wrangler pages deploy`) are done **only by Cline** (deployment owner). Other agents never deploy; they build and hand off.
- Add `.tmp/` to `.gitignore`.

## 7. TASK BOARD (`COORDINATION/TASKS.md`)

```
| ID    | Title             | Owner    | Status         | Depends on | Branch         | Paths              | Acceptance criteria |
|-------|-------------------|----------|----------------|------------|----------------|--------------------|---------------------|
| T-001 | {{Auth API}}      | opencode | in-progress    | —          | agent/opencode | src/api/auth/**    | {{tests pass}}      |
| T-002 | {{Login screen}}  | kilo     | blocked(T-001) | T-001      | agent/kilo     | src/pages/Login/** | {{calls /auth}}     |
```

- Status flow: `todo` → `claimed` → `in-progress` → `review` → `done` (or `blocked(reason)`).
- Claim = set Owner + `claimed` + write lock, **before** starting.
- Tasks touching the same files must be serialized via `Depends on`. Never start a task whose dependencies aren't `done`.

## 8. HANDOFFS (`COORDINATION/HANDOFFS.md`)

```
### H-{{NNN}} · {{from}} → {{to}} · {{open|accepted|done|rejected}} · {{timestamp}}
Need: {{one sentence}}
Why: {{what is blocked}}
Files involved: {{paths}}
Proposed change/interface: {{snippet}}
Done when: {{observable condition}}
```

Requester keeps working on something else meanwhile. Recipient acknowledges next cycle and links the commit on closing.

## 9. CONTRACTS (`COORDINATION/CONTRACTS.md`)

Single source of truth for APIs (method, path, request/response, errors), shared types, DB schema, env var names, events, design tokens.

```
## {{Contract}} · owner: {{agent}} · v{{1.0}} · {{draft|agreed}}
{{definition}}
Consumers: {{agents}}
```

Only the owner edits. Breaking changes need a version bump, a handoff to every consumer, and human approval in DECISIONS.md. Code against `agreed` contracts; stub `draft` ones.

## 10. ACTIVITY LOG (`COORDINATION/LOG.md`)

```
{{2026-01-01 10:05 UTC}} · {{opencode}} · {{T-001}} · {{started | locked src/api/auth/** | committed abc123 | finished | BLOCKER: ... | CONFLICT: ...}}
```

## 11. TASK CHECKLIST (every agent, every task)

**Start**
- [ ] Re-read AGENTS.md, TASKS, LOCKS, HANDOFFS, CONTRACTS
- [ ] Rebased onto `origin/main`
- [ ] Task is mine and dependencies are `done`
- [ ] Locks acquired, log line written

**Work**
- [ ] Editing only owned/locked files
- [ ] Small commits, correct message format
- [ ] Cross-lane needs go through handoffs

**Finish**
- [ ] Lint + tests pass
- [ ] `git diff --stat` shows nothing outside my lane
- [ ] Contracts/docs updated if an interface changed
- [ ] Task → `review`, locks released, log written, tree clean
- [ ] Summary posted: what changed, how to verify, known gaps

## 12. MERGE & REVIEW

- Agents open PRs `agent/{{name}}` → `main`; **only the human merges.**
- Merge in dependency order; run the full suite after each merge.
- Reviewer (Cline or human) checks: in lane, matches contracts, tests present, no secrets, no unrelated diffs. Findings go in HANDOFFS.md; the reviewer doesn't edit others' source.
- Merge conflicts: the file's owner resolves; if ownership is split, the human decides.

## 13. ESCALATION

| Situation | Action |
|---|---|
| Two agents need the same file | Second waits or switches task; log it |
| Contract mismatch | Stop, handoff to owner, do other work |
| Test failure outside my lane | Don't fix; handoff with failing output |
| Instruction conflicts with this file | Follow this file, log `CONFLICT:`, ask the human |
| Unsure a command is safe | Don't run it; ask the human |
| Stuck/looping (>3 failed attempts) | Stop, log blocker and what was tried |

## 14. AGENT-SPECIFIC NOTES

- **Kilo Code:** Architect mode to plan UI/map structure, Code mode to implement. Keep the interface mobile-first and map-centric per the brief.
- **OpenCode:** Run migrations only on `opencode_dev`; never on production or shared data. Enforce all authorization server-side / via RLS.
- **Cline:** Plan/Act mode; keep auto-approve OFF for shell commands. Sole owner of Cloudflare deploys. Reviews others' PRs without editing their source.

## 15. STARTER PROMPT (paste at the start of each agent session)

```
You are the {{AGENT}} agent on FloodWatch Bengaluru. Read /AGENTS.md and everything in /COORDINATION
first. Follow the protocol exactly: claim a task in TASKS.md, acquire locks, work only inside
the paths you own on branch agent/{{name}}, log your activity, and use HANDOFFS.md for anything
outside your lane. Current task: {{TASK_ID and description}}.
If anything conflicts or is unclear, stop and flag it instead of guessing.
```

---

*Version 1.0 · Last reviewed 2026-10-10 · Owner: Human project owner (update before first agent run)*
