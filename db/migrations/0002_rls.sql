-- =============================================================================
-- FloodWatch Bengaluru — Row-Level Security policies (T-005)
--
-- Model: deny-by-default. Every table has RLS ENABLED. Public (guest) read is
-- granted ONLY for visible, non-hidden incidents/observations. All writes are
-- scoped to the authenticated user. Privileged roles (moderator/admin/responder)
-- get explicit policies. The service_role (server only) bypasses RLS and MUST
-- never be exposed to the browser.
--
-- Apply AFTER 0001_init.sql.
-- =============================================================================

-- Helper: current caller's role without a recursive RLS lookup on profiles.
-- SECURITY DEFINER so it can read profiles.role regardless of the caller's RLS.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(public.current_user_role() IN ('moderator','admin','responder'), false);
$$;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_public ON public.profiles;
CREATE POLICY profiles_select_public ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  );

DROP POLICY IF EXISTS profiles_admin_all ON public.profiles;
CREATE POLICY profiles_admin_all ON public.profiles
  FOR ALL USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- -----------------------------------------------------------------------------
-- incidents — public read of visible rows; owners/admins write.
-- -----------------------------------------------------------------------------
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS incidents_select_public ON public.incidents;
CREATE POLICY incidents_select_public ON public.incidents
  FOR SELECT USING (moderation_status = 'visible');

DROP POLICY IF EXISTS incidents_insert_auth ON public.incidents;
CREATE POLICY incidents_insert_auth ON public.incidents
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

DROP POLICY IF EXISTS incidents_update_owner_or_staff ON public.incidents;
CREATE POLICY incidents_update_owner_or_staff ON public.incidents
  FOR UPDATE USING (created_by = auth.uid() OR public.is_staff())
  WITH CHECK (created_by = auth.uid() OR public.is_staff());

-- -----------------------------------------------------------------------------
-- observations — public read of visible; authors insert own; staff manage.
-- -----------------------------------------------------------------------------
ALTER TABLE public.observations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS observations_select_public ON public.observations;
CREATE POLICY observations_select_public ON public.observations
  FOR SELECT USING (moderation_status = 'visible');

DROP POLICY IF EXISTS observations_insert_self ON public.observations;
CREATE POLICY observations_insert_self ON public.observations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND submitted_by = auth.uid());

DROP POLICY IF EXISTS observations_update_staff ON public.observations;
CREATE POLICY observations_update_staff ON public.observations
  FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());

-- -----------------------------------------------------------------------------
-- evidence — never publicly listed directly; served via signed URLs from a
-- server function. Only staff and the submitting author (read) may see rows.
-- -----------------------------------------------------------------------------
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS evidence_select_staff_or_author ON public.evidence;
CREATE POLICY evidence_select_staff_or_author ON public.evidence
  FOR SELECT USING (
    public.is_staff()
    OR EXISTS (
      SELECT 1 FROM public.observations o
      WHERE o.id = evidence.observation_id AND o.submitted_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS evidence_write_staff ON public.evidence;
CREATE POLICY evidence_write_staff ON public.evidence
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

-- -----------------------------------------------------------------------------
-- verifications — one active per user; users manage their own; counts readable.
-- -----------------------------------------------------------------------------
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS verifications_select_all_auth ON public.verifications;
CREATE POLICY verifications_select_all_auth ON public.verifications
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS verifications_write_self ON public.verifications;
CREATE POLICY verifications_write_self ON public.verifications
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS verifications_update_self ON public.verifications;
CREATE POLICY verifications_update_self ON public.verifications
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS verifications_delete_self ON public.verifications;
CREATE POLICY verifications_delete_self ON public.verifications
  FOR DELETE USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- history tables — append-only, readable (public timeline facts), but NOT
-- updatable/deletable via RLS (mutations go through SECURITY DEFINER functions
-- or the service role).
-- -----------------------------------------------------------------------------
ALTER TABLE public.incident_status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ish_select_public ON public.incident_status_history;
CREATE POLICY ish_select_public ON public.incident_status_history FOR SELECT USING (true);

ALTER TABLE public.incident_verification_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ivh_select_public ON public.incident_verification_history;
CREATE POLICY ivh_select_public ON public.incident_verification_history FOR SELECT USING (true);

-- -----------------------------------------------------------------------------
-- incident_flags — a user can create a flag; users read their own; staff all.
-- -----------------------------------------------------------------------------
ALTER TABLE public.incident_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS flags_insert_self ON public.incident_flags;
CREATE POLICY flags_insert_self ON public.incident_flags
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND reported_by = auth.uid());
DROP POLICY IF EXISTS flags_select_self_or_staff ON public.incident_flags;
CREATE POLICY flags_select_self_or_staff ON public.incident_flags
  FOR SELECT USING (reported_by = auth.uid() OR public.is_staff());
DROP POLICY IF EXISTS flags_update_staff ON public.incident_flags;
CREATE POLICY flags_update_staff ON public.incident_flags
  FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());

-- -----------------------------------------------------------------------------
-- saved_locations, notifications — strictly private to the owning user.
-- -----------------------------------------------------------------------------
ALTER TABLE public.saved_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS saved_locations_self ON public.saved_locations;
CREATE POLICY saved_locations_self ON public.saved_locations
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notifications_self ON public.notifications;
CREATE POLICY notifications_self ON public.notifications
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- moderation_actions, audit_logs — staff/admin read; no client writes via RLS
-- (writes happen through service_role / SECURITY DEFINER functions).
-- -----------------------------------------------------------------------------
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mod_actions_select_staff ON public.moderation_actions;
CREATE POLICY mod_actions_select_staff ON public.moderation_actions
  FOR SELECT USING (public.is_staff());

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_logs_select_admin ON public.audit_logs;
CREATE POLICY audit_logs_select_admin ON public.audit_logs
  FOR SELECT USING (public.current_user_role() = 'admin');

-- idempotency_keys — private to the owning user.
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS idempotency_self ON public.idempotency_keys;
CREATE POLICY idempotency_self ON public.idempotency_keys
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

