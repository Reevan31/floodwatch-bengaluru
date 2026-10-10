-- =============================================================================
-- FloodWatch Bengaluru — DEMONSTRATION seed data (T-005)
--
-- ⚠️  ALL ROWS BELOW ARE SYNTHETIC. They do NOT represent real flooding in
--     Bengaluru. Every demo incident's public_reference is prefixed "DEMO-"
--     and descriptions state they are samples. Run only on a dev/local DB.
--
-- Requires at least one profile; demo incidents attach to the earliest profile.
-- Safe to re-run: it clears prior DEMO- incidents (child rows cascade) first.
-- =============================================================================

DO $$
DECLARE
  demo_author uuid;
BEGIN
  SELECT id INTO demo_author FROM public.profiles ORDER BY created_at ASC LIMIT 1;

  IF demo_author IS NULL THEN
    RAISE NOTICE 'No profiles exist yet — skipping demo seed. Create a user first.';
    RETURN;
  END IF;

  -- Clean previous demo incidents (cascades to observations/evidence/etc.).
  DELETE FROM public.incidents WHERE public_reference LIKE 'DEMO-%';

  -- 1) UNVERIFIED severe (underpass) — single observation, no corroboration.
  INSERT INTO public.incidents
    (public_reference, category, reported_severity, status, verification_status,
     location, public_location, locality, street_name, created_by, first_reported_at, last_observed_at)
  VALUES
    ('DEMO-0001', 'underpass_flooding', 'severe', 'open', 'unverified',
     ST_SetSRID(ST_MakePoint(77.5970, 13.0358), 4326)::geography,
     ST_SetSRID(ST_MakePoint(77.5975, 13.0362), 4326)::geography,
     'Hebbal', 'Hebbal flyover underpass', demo_author, now() - interval '40 minutes', now() - interval '40 minutes');

  -- 2) COMMUNITY-CORROBORATED moderate (road waterlogging), multiple observations.
  INSERT INTO public.incidents
    (public_reference, category, reported_severity, status, verification_status,
     location, public_location, locality, street_name, created_by, first_reported_at, last_observed_at)
  VALUES
    ('DEMO-0002', 'road_waterlogging', 'moderate', 'monitoring', 'community_corroborated',
     ST_SetSRID(ST_MakePoint(77.6266, 12.9345), 4326)::geography,
     ST_SetSRID(ST_MakePoint(77.6271, 12.9349), 4326)::geography,
     'Koramangala', '80 Feet Road', demo_author, now() - interval '2 hours', now() - interval '25 minutes');

  -- 3) IMPROVING incident (drain overflow).
  INSERT INTO public.incidents
    (public_reference, category, reported_severity, status, verification_status,
     location, public_location, locality, street_name, created_by, first_reported_at, last_observed_at)
  VALUES
    ('DEMO-0003', 'drain_overflow', 'moderate', 'improving', 'community_corroborated',
     ST_SetSRID(ST_MakePoint(77.5703, 13.0033), 4326)::geography,
     ST_SetSRID(ST_MakePoint(77.5708, 13.0037), 4326)::geography,
     'Malleshwaram', '8th Cross', demo_author, now() - interval '5 hours', now() - interval '90 minutes');

  -- 4) RESOLVED incident.
  INSERT INTO public.incidents
    (public_reference, category, reported_severity, status, verification_status,
     location, public_location, locality, street_name, created_by, first_reported_at, last_observed_at, resolved_at)
  VALUES
    ('DEMO-0004', 'road_waterlogging', 'moderate', 'resolved', 'community_corroborated',
     ST_SetSRID(ST_MakePoint(77.5367, 12.9719), 4326)::geography,
     ST_SetSRID(ST_MakePoint(77.5372, 12.9723), 4326)::geography,
     'Vijayanagar', 'Service Road', demo_author, now() - interval '20 hours', now() - interval '18 hours', now() - interval '18 hours');

  -- 5) STALE low report (older than freshness window) — visibly stale sample.
  INSERT INTO public.incidents
    (public_reference, category, reported_severity, status, verification_status,
     location, public_location, locality, street_name, created_by, first_reported_at, last_observed_at, stale_at)
  VALUES
    ('DEMO-0005', 'street_flooding', 'low', 'open', 'unverified',
     ST_SetSRID(ST_MakePoint(77.6101, 12.9166), 4326)::geography,
     ST_SetSRID(ST_MakePoint(77.6106, 12.9170), 4326)::geography,
     'BTM Layout', '2nd Stage', demo_author, now() - interval '9 hours', now() - interval '9 hours', now() - interval '5 hours');

  -- 6+7) Two POTENTIALLY DUPLICATE severe reports close together (Bellandur ORR).
  INSERT INTO public.incidents
    (public_reference, category, reported_severity, status, verification_status,
     location, public_location, locality, street_name, created_by, first_reported_at, last_observed_at)
  VALUES
    ('DEMO-0006', 'road_waterlogging', 'severe', 'open', 'community_corroborated',
     ST_SetSRID(ST_MakePoint(77.6764, 12.9254), 4326)::geography,
     ST_SetSRID(ST_MakePoint(77.6769, 12.9258), 4326)::geography,
     'Bellandur', 'ORR service lane (east)', demo_author, now() - interval '3 hours', now() - interval '70 minutes'),
    ('DEMO-0007', 'road_waterlogging', 'severe', 'open', 'unverified',
     ST_SetSRID(ST_MakePoint(77.6772, 12.9250), 4326)::geography, -- ~15 m from DEMO-0006
     ST_SetSRID(ST_MakePoint(77.6777, 12.9254), 4326)::geography,
     'Bellandur', 'ORR service lane (west)', demo_author, now() - interval '50 minutes', now() - interval '50 minutes');

  -- Follow-up observations to exercise timelines (all synthetic).
  INSERT INTO public.observations (incident_id, submitted_by, observed_at, category, reported_severity, description, evidence_available, road_passability)
  SELECT id, demo_author, now() - interval '25 minutes', 'road_waterlogging', 'moderate',
         'SYNTHETIC follow-up: water still present but draining.', false, 'partially_blocked'
  FROM public.incidents WHERE public_reference = 'DEMO-0002';

  INSERT INTO public.observations (incident_id, submitted_by, observed_at, category, reported_severity, description, evidence_available, road_passability)
  SELECT id, demo_author, now() - interval '18 hours', 'road_waterlogging', 'low',
         'SYNTHETIC follow-up: water has receded.', false, 'passable'
  FROM public.incidents WHERE public_reference = 'DEMO-0004';

  RAISE NOTICE 'Demo seed complete: 7 synthetic DEMO- incidents inserted (author %).', demo_author;
END $$;

