-- =============================================================================
-- FloodWatch Bengaluru — Initial schema (T-005)
-- Target: PostgreSQL 15+ with the PostGIS extension.
--
-- HOW TO APPLY (no database exists in the current dev sandbox, so these are
-- reviewable artifacts — run them against a real Postgres+PostGIS instance):
--
--   # Supabase (local):  supabase start && supabase db reset
--   # Supabase (remote): supabase db push
--   # Plain Postgres:    psql "$DATABASE_URL" -f db/migrations/0001_init.sql
--
-- Rollback: db/migrations/0001_init_down.sql (drops objects created here).
-- =============================================================================

-- Required for geography(Point) columns and spatial indexes.
CREATE EXTENSION IF NOT EXISTS postgis;
-- For gen_random_uuid() on older PG (< 13). Safe no-op on PG 13+.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- Enums (kept as CHECK constraints below instead, so values are easy to evolve
-- without ALTER TYPE; see each table). We DO use enums for the small, stable
-- role + status vocabularies to get typo-safety and cheap storage.
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('guest', 'resident', 'moderator', 'admin', 'responder');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE account_status AS ENUM ('active', 'suspended', 'deleted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE incident_status AS ENUM ('open', 'monitoring', 'improving', 'resolved', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE verification_status AS ENUM ('unverified', 'community_corroborated', 'admin_reviewed', 'officially_confirmed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE moderation_status AS ENUM ('visible', 'hidden', 'pending_review', 'removed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- A. profiles — 1:1 with auth.users. Public display identity only.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name   text NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 60),
  avatar_url     text,
  role           user_role NOT NULL DEFAULT 'resident',
  account_status account_status NOT NULL DEFAULT 'active',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- B. incidents — a logical flooding incident that may group many observations.
--    `location` is the canonical point; `public_location` is an intentionally
--    GENERALIZED point safe to expose publicly (privacy by design).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.incidents (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_reference    text NOT NULL UNIQUE,
  category            text NOT NULL,
  reported_severity   text NOT NULL CHECK (reported_severity IN ('low','moderate','severe')),
  status              incident_status NOT NULL DEFAULT 'open',
  verification_status verification_status NOT NULL DEFAULT 'unverified',
  location            geography(Point, 4326) NOT NULL,
  public_location     geography(Point, 4326),
  locality            text,
  street_name         text,
  first_reported_at   timestamptz NOT NULL DEFAULT now(),
  last_observed_at    timestamptz NOT NULL DEFAULT now(),
  resolved_at         timestamptz,
  stale_at            timestamptz,
  created_by          uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  duplicate_of        uuid REFERENCES public.incidents(id) ON DELETE SET NULL,
  moderation_status   moderation_status NOT NULL DEFAULT 'visible',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT incidents_not_self_duplicate CHECK (duplicate_of IS NULL OR duplicate_of <> id)
);

CREATE INDEX IF NOT EXISTS incidents_location_gix    ON public.incidents USING GIST (location);
CREATE INDEX IF NOT EXISTS incidents_status_idx      ON public.incidents (status);
CREATE INDEX IF NOT EXISTS incidents_verif_idx       ON public.incidents (verification_status);
CREATE INDEX IF NOT EXISTS incidents_last_observed   ON public.incidents (last_observed_at DESC);
CREATE INDEX IF NOT EXISTS incidents_category_idx    ON public.incidents (category);
CREATE INDEX IF NOT EXISTS incidents_moderation_idx  ON public.incidents (moderation_status);

-- -----------------------------------------------------------------------------
-- C. observations — individual reports / follow-ups attached to an incident.
--    Never overwritten; new observations append so history is preserved.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.observations (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id               uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  submitted_by              uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  observed_at               timestamptz NOT NULL DEFAULT now(),
  submitted_at              timestamptz NOT NULL DEFAULT now(),
  location                  geography(Point, 4326),
  category                  text NOT NULL,
  reported_severity         text NOT NULL CHECK (reported_severity IN ('low','moderate','severe')),
  estimated_water_depth_range text CHECK (estimated_water_depth_range IN ('ankle','knee','waist','chest','unknown')),
  description               text CHECK (char_length(description) <= 1000),
  road_passability          text CHECK (road_passability IN ('passable','partially_blocked','impassable','unknown')),
  evidence_available        boolean NOT NULL DEFAULT false,
  moderation_status         moderation_status NOT NULL DEFAULT 'visible',
  created_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS observations_incident_idx  ON public.observations (incident_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS observations_location_gix  ON public.observations USING GIST (location);
CREATE INDEX IF NOT EXISTS observations_submitter    ON public.observations (submitted_by, submitted_at DESC);

-- -----------------------------------------------------------------------------
-- D. evidence — image/file references. storage_path points at a PRIVATE bucket;
--    published_path is only populated after sanitisation. No credentials stored.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.evidence (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id   uuid NOT NULL REFERENCES public.observations(id) ON DELETE CASCADE,
  storage_path     text NOT NULL,
  thumbnail_path   text,
  published_path   text,
  media_type       text NOT NULL CHECK (media_type IN ('image/jpeg','image/png','image/webp')),
  file_size        integer NOT NULL CHECK (file_size > 0 AND file_size <= 15728640), -- ≤ 15 MiB
  width            integer,
  height           integer,
  processing_status text NOT NULL DEFAULT 'pending'
                     CHECK (processing_status IN ('pending','processing','ready','failed','rejected')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  published_at     timestamptz,
  deleted_at       timestamptz
);

CREATE INDEX IF NOT EXISTS evidence_observation_idx ON public.evidence (observation_id);
CREATE INDEX IF NOT EXISTS evidence_status_idx      ON public.evidence (processing_status);

-- -----------------------------------------------------------------------------
-- E. verifications — one ACTIVE assessment per (user, incident). History is
--    preserved in incident_verification_history on change.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.verifications (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id           uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  user_id               uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assessment_type       text NOT NULL CHECK (assessment_type IN (
                          'still_flooded','level_increasing','level_decreasing',
                          'no_longer_flooded','road_impassable','road_passable','info_inaccurate')),
  comment               text CHECK (char_length(comment) <= 500),
  assessment_timestamp  timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT verifications_one_active_per_user UNIQUE (incident_id, user_id)
);

CREATE INDEX IF NOT EXISTS verifications_incident_idx ON public.verifications (incident_id, assessment_timestamp DESC);

-- -----------------------------------------------------------------------------
-- F/G. status + verification history (append-only audit trail).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.incident_status_history (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id                uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  previous_status            incident_status,
  new_status                 incident_status NOT NULL,
  changed_by                 uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  change_reason              text,
  created_at                 timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ish_incident_idx ON public.incident_status_history (incident_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.incident_verification_history (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id                   uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  previous_verification_status  verification_status,
  new_verification_status       verification_status NOT NULL,
  changed_by                    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  change_reason                 text,
  created_at                    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ivh_incident_idx ON public.incident_verification_history (incident_id, created_at DESC);


-- -----------------------------------------------------------------------------
-- H. incident_flags — abuse / inaccuracy reports by users.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.incident_flags (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id  uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  reported_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  flag_reason  text NOT NULL CHECK (flag_reason IN ('inaccurate','duplicate','spam','abusive','unsafe','other')),
  description  text CHECK (char_length(description) <= 500),
  status       text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','actioned','dismissed')),
  reviewed_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS flags_status_idx  ON public.incident_flags (status, created_at DESC);
CREATE INDEX IF NOT EXISTS flags_incident_idx ON public.incident_flags (incident_id);

-- -----------------------------------------------------------------------------
-- I. saved_locations — opt-in alert radii for a user.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saved_locations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label                 text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 80),
  location              geography(Point, 4326) NOT NULL,
  radius_meters         integer NOT NULL DEFAULT 1000 CHECK (radius_meters BETWEEN 100 AND 20000),
  notifications_enabled boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS saved_locations_user_idx  ON public.saved_locations (user_id);
CREATE INDEX IF NOT EXISTS saved_locations_geo_gix   ON public.saved_locations USING GIST (location);

-- -----------------------------------------------------------------------------
-- J. notifications — in-app first; delivery_status tracks future channels.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  incident_id      uuid REFERENCES public.incidents(id) ON DELETE CASCADE,
  title            text NOT NULL,
  body             text NOT NULL,
  read_at          timestamptz,
  delivery_status  text NOT NULL DEFAULT 'in_app' CHECK (delivery_status IN ('in_app','sent','failed','suppressed')),
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread   ON public.notifications (user_id) WHERE read_at IS NULL;

-- -----------------------------------------------------------------------------
-- K. moderation_actions — every moderator decision.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_type  text NOT NULL CHECK (target_type IN ('incident','observation','evidence','flag','verification')),
  target_id    uuid NOT NULL,
  action_type  text NOT NULL,
  reason       text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mod_actions_moderator_idx ON public.moderation_actions (moderator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mod_actions_target_idx     ON public.moderation_actions (target_type, target_id);

-- -----------------------------------------------------------------------------
-- L. audit_logs — sensitive admin actions. NOT user-editable (see RLS).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id   uuid,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx  ON public.audit_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON public.audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_logs_created    ON public.audit_logs (created_at DESC);

-- -----------------------------------------------------------------------------
-- M. idempotency_keys — safe retries for report creation & other mutations.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  idempotency_key    text NOT NULL,
  operation_type     text NOT NULL,
  request_hash       text NOT NULL,
  response_reference uuid,
  created_at         timestamptz NOT NULL DEFAULT now(),
  expires_at         timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  CONSTRAINT idempotency_unique UNIQUE (user_id, idempotency_key, operation_type)
);
CREATE INDEX IF NOT EXISTS idempotency_expiry_idx ON public.idempotency_keys (expires_at);

