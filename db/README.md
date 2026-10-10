# FloodWatch Bengaluru — Database (OpenCode lane, T-005)

PostgreSQL 15+ with **PostGIS**. Migrations are plain SQL so they run under
Supabase, plain Postgres, or any managed PG.

## Files

| File | Purpose |
|---|---|
| `migrations/0001_init.sql` | Extensions, enums, all tables, indexes (incl. spatial GiST). |
| `migrations/0002_rls.sql`  | Row-Level Security: enable + policies + `SECURITY DEFINER` role helpers. |
| `migrations/0003_seed_demo.sql` | Clearly-labelled **synthetic** demo incidents/observations. |
| `migrations/0001_init_down.sql` | Rollback for `0001` (drops everything it created). |

## Schema summary

- **profiles** — 1:1 with `auth.users`; public display identity + `role`.
- **incidents** — a logical flood incident; canonical `location` (precise) and
  `public_location` (generalized for privacy). Stores `status`,
  `verification_status`, `moderation_status` as **separate** attributes.
- **observations** — individual reports/follow-ups; append-only (history kept).
- **evidence** — private storage references; `published_path` only after
  sanitisation. No credentials stored.
- **verifications** — one active assessment per `(user, incident)`
  (`UNIQUE`), with history in `incident_verification_history`.
- **incident_status_history / incident_verification_history** — audit trails.
- **incident_flags, saved_locations, notifications, moderation_actions,
  audit_logs, idempotency_keys**.

## How to apply

### Supabase (local)
```bash
supabase start
supabase db reset          # applies supabase/migrations in order
# then seed demo data:
psql "$DATABASE_URL" -f db/migrations/0003_seed_demo.sql
```

### Supabase (remote)
```bash
supabase link --project-ref <your-ref>
supabase db push           # if migrations live in supabase/migrations
```

### Plain Postgres
```bash
psql "$DATABASE_URL" -f db/migrations/0001_init.sql
psql "$DATABASE_URL" -f db/migrations/0002_rls.sql
psql "$DATABASE_URL" -f db/migrations/0003_seed_demo.sql   # optional demo data
```

## Rollback / reset
```bash
psql "$DATABASE_URL" -f db/migrations/0001_init_down.sql   # ⚠️ deletes all data
```

## Security notes
- RLS is **deny-by-default** and enabled on every table.
- `current_user_role()` / `is_staff()` are `SECURITY DEFINER` so policies can
  check roles without recursive RLS on `profiles`.
- The `service_role` key bypasses RLS — it is **server-only** and must never be
  shipped to the browser. Privileged writes (role changes, moderation, audit)
  go through server functions / the service role.
- Users cannot escalate their own role (see `profiles_update_self`).

## ⚠️ Not yet executed
No PostgreSQL/PostGIS instance (and no Docker/Supabase CLI) exists in the
current dev sandbox, so these migrations are **reviewable artifacts that have
not been run here**. Apply them against a real instance and run the schema/RLS
integration tests (T-003/T-006) to verify.
