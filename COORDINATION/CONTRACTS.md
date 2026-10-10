# COORDINATION — CONTRACTS

> Single source of truth for APIs, shared types, DB schema, env var names, events, design tokens. Only the owner edits. Breaking changes need a version bump + handoff to consumers + human approval in DECISIONS.md.

## Hosting/Deploy · owner: cline · v1.0 · agreed
- Static site built to `dist/` via `pnpm build`.
- Deployed to **Cloudflare Pages** project `floodwatch-bengaluru` (production branch `main`).
- Deploy command: `pnpm exec wrangler pages deploy dist --project-name floodwatch-bengaluru --branch main --commit-dirty=true`.
- Security/caching headers live in `public/_headers` (copied to `dist/_headers` on build).
- Consumers: all agents (do not change hosting without a handoff).

## Env vars · owner: opencode · v0.1 · draft
- `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` (optional; otherwise use `wrangler login` OAuth session). **Never committed.**
- Frontend public vars must use the `VITE_` prefix (Vite requirement) and contain no secrets.
- Consumers: cline (deploy), kilo (frontend).

## Frontend demo-incident shape · owner: kilo · v2.0 · draft
- `DemoIncident` now lives in **`src/incidents.ts`** (shared by `main.ts` and `map.ts`):
  `{ id, locality, title, category, severity: 'low'|'moderate'|'severe', verification: 'unverified'|'community', status: 'active'|'improving'|'resolved'|'stale', observationTime, observations, confirmations, description, lat, lng }`.
- v2 change: `x`/`y` (SVG %) **replaced** by real `lat`/`lng` (WGS84) for the Leaflet map. Also exports `BENGALURU_CENTER`.
- Map API: `createFloodMap(container, center, onSelect): MapHandle` in `src/map.ts`.
- Will be superseded by the backend `incidents`/`observations` contract (T-005). Consumers: cline (tests), opencode (mapping to schema).

## DB schema · owner: opencode · v0.1 · draft
- Tables: `profiles, incidents, observations, evidence, verifications, incident_status_history, incident_verification_history, incident_flags, saved_locations, notifications, moderation_actions, audit_logs, idempotency_keys`. See `db/migrations/`.
- `incidents.location` = precise `geography(Point,4326)`; `incidents.public_location` = generalized point for public display (privacy).
- Enums: `user_role, account_status, incident_status, verification_status, moderation_status`.
- RLS enabled on all tables; `service_role` is server-only. Consumers: kilo (data layer once backend is wired), cline (integration tests).
