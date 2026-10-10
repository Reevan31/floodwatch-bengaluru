# COORDINATION — TASKS

> Backlog + status board. Status flow: `todo` → `claimed` → `in-progress` → `review` → `done` (or `blocked(reason)`).
> Claim = set Owner + `claimed` + write lock in `LOCKS.md` BEFORE starting. Edit only your own rows.

| ID    | Title                                             | Owner    | Status      | Depends on | Branch         | Paths                                   | Acceptance criteria |
|-------|---------------------------------------------------|----------|-------------|------------|----------------|-----------------------------------------|---------------------|
| T-000 | Instantiate AGENTS.md + COORDINATION protocol     | cline    | done        | —          | agent/cline    | `AGENTS.md`, `COORDINATION/**`, pointer files | All placeholders filled; 6 coordination files exist; template removed |
| T-001 | Author versioned SPEC.md from master build brief  | cline    | todo        | T-000      | agent/cline    | `docs/SPEC.md`                          | Derived from master brief; reviewed by human |
| T-002 | Initialize git repo + agent branches/worktrees    | human    | todo        | T-000      | main           | repo root                               | `git init`; branches `agent/kilo`, `agent/opencode`, `agent/cline` exist |
| T-003 | Configure test runner (Vitest) + lint (ESLint)    | cline    | todo        | T-001      | agent/cline    | `package.json`*, config, `tests/**`     | `pnpm test` and `pnpm lint` run; scripts added (*via human handoff) |
| T-004 | Replace illustrative SVG map with real Leaflet map (OSM tiles, markers, clustering, geolocation) | kilo   | review   | T-001      | agent/kilo     | `src/**`, `public/**`                       | Map renders in browser; markers reflect filters; clusters; center-on-me |
| T-005 | Design DB schema + PostGIS migrations (incidents, observations, evidence, verifications, …) | opencode | review | T-001      | agent/opencode | `db/**`, `supabase/**` | Migrations apply on Postgres+PostGIS; RLS defined; seed labeled demo |
| T-006 | Build report submission workflow + evidence upload | kilo + opencode | todo | T-005 | both         | `src/**`, `supabase/**`                 | Server-validated submission; sanitized image; incident + observation persisted |

*Human-only file — coordinate via HANDOFFS.md.
