-- =============================================================================
-- FloodWatch Bengaluru — Rollback for 0001_init.sql (T-005)
--
-- Drops every object created by 0001_init.sql, in dependency-safe order.
-- ⚠️  DESTRUCTIVE — this deletes all FloodWatch data. Run only when you intend
--     to tear the schema down (e.g. local reset). NOT for shared/prod data.
--
--   psql "$DATABASE_URL" -f db/migrations/0001_init_down.sql
-- =============================================================================

DROP TABLE IF EXISTS public.idempotency_keys;
DROP TABLE IF EXISTS public.audit_logs;
DROP TABLE IF EXISTS public.moderation_actions;
DROP TABLE IF EXISTS public.notifications;
DROP TABLE IF EXISTS public.saved_locations;
DROP TABLE IF EXISTS public.incident_flags;
DROP TABLE IF EXISTS public.incident_verification_history;
DROP TABLE IF EXISTS public.incident_status_history;
DROP TABLE IF EXISTS public.verifications;
DROP TABLE IF EXISTS public.evidence;
DROP TABLE IF EXISTS public.observations;
DROP TABLE IF EXISTS public.incidents;
DROP TABLE IF EXISTS public.profiles;

DROP FUNCTION IF EXISTS public.is_staff();
DROP FUNCTION IF EXISTS public.current_user_role();

DROP TYPE IF EXISTS moderation_status;
DROP TYPE IF EXISTS verification_status;
DROP TYPE IF EXISTS incident_status;
DROP TYPE IF EXISTS account_status;
DROP TYPE IF EXISTS user_role;

-- Note: postgis/pgcrypto extensions are intentionally left installed (shared).
