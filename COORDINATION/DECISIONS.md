# COORDINATION — DECISIONS

> Architecture decisions: what, why, who approved. Append-only.

| ID  | Date (UTC)     | Decision | Why | Approved by |
|-----|----------------|----------|-----|-------------|
| D-001 | 2026-10-10 | Host the frontend on **Cloudflare Pages** (not Vercel) | User's Cloudflare account was open/authenticated; static site fits Pages; Wrangler deploy is reproducible | Human |
| D-002 | 2026-10-10 | Approve `workerd` build script in `pnpm-workspace.yaml` | pnpm 11 blocks postinstall by default; Wrangler needs the workerd native binary. Fixes the pre-build dependency check failure | Human |
| D-003 | 2026-10-10 | Adopt the multi-agent coordination protocol (AGENTS.md + COORDINATION/) | User provided `AGENTS.template.md`; roles mapped to Kilo (frontend), OpenCode (backend), Cline (tests/docs/deploy) | Human |
| D-004 | 2026-10-10 | Keep production security headers in `public/_headers` (CSP, frame/referrer/nosniff, cache policy) | Applies automatically on Pages deploy; keeps hardening in-repo and version-controlled | Human |
| D-005 | 2026-10-10 | Use **Leaflet + OpenStreetMap tiles + leaflet.markercluster** for the interactive map (Kilo, T-004) | Mature, MIT-licensed, no API key; OSM tile policy permits this usage with attribution; clustering handles dense markers | Human |
| D-006 | 2026-10-10 | Persist the Leaflet map DOM node across the app's full re-renders instead of recreating it (Kilo, T-004) | `render()` rewrites `innerHTML`; recreating the map on every keystroke would be slow and lose pan/zoom. We move the live node back and call `setIncidents()` | Human |
| D-007 | 2026-10-10 | Author DB migrations as plain SQL in `db/migrations/` with a down script (OpenCode, T-005) | Portable across Supabase and plain Postgres; reproducible; rollback documented. NOT executed — no DB in sandbox | Human |
| D-008 | 2026-10-10 | Separate `incidents.location` (precise) from `incidents.public_location` (generalized) | Privacy by design: expose an approximate point publicly, keep precise coords for authorized operational use | Human |
