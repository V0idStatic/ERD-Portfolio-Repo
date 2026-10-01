-- GabAI Supabase Auth integration, grants, and row-level security
-- Apply after sql/gabai_liamerd.sql and before sql/gabai_read_models.sql.

BEGIN;

-- Keep authorization helpers outside the exposed public schema.
CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA app_private TO authenticated, service_role;

-- Tie every application identity to exactly one Supabase Auth identity.
ALTER TABLE public.application_users
    ADD CONSTRAINT fk_application_users_auth_user_to_auth_users
    FOREIGN KEY (auth_user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

-- Create the application identity in the same transaction as Auth signup.
CREATE OR REPLACE FUNCTION app_private.handle_auth_user_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.application_users (auth_user_id, display_name)
    VALUES (
        NEW.id,
        COALESCE(
            NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'display_name'), ''),
            NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'full_name'), ''),
            NULLIF(SPLIT_PART(COALESCE(NEW.email, ''), '@', 1), ''),
            'User'
        )
    )
    ON CONFLICT (auth_user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION app_private.handle_auth_user_created() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION app_private.handle_auth_user_created();

-- Backfill identities if users signed up before this migration was installed.
INSERT INTO public.application_users (auth_user_id, display_name)
SELECT
    au.id,
    COALESCE(
        NULLIF(BTRIM(au.raw_user_meta_data ->> 'display_name'), ''),
        NULLIF(BTRIM(au.raw_user_meta_data ->> 'full_name'), ''),
        NULLIF(SPLIT_PART(COALESCE(au.email, ''), '@', 1), ''),
        'User'
    )
FROM auth.users AS au
ON CONFLICT (auth_user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION app_private.current_app_user_id()
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT u.user_id
    FROM public.application_users AS u
    WHERE (SELECT auth.uid()) IS NOT NULL
      AND u.auth_user_id = (SELECT auth.uid())
      AND u.is_active
    LIMIT 1
$$;

CREATE OR REPLACE FUNCTION app_private.is_member(p_institution_id INT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT (SELECT auth.uid()) IS NOT NULL
       AND EXISTS (
            SELECT 1
            FROM public.institution_memberships AS im
            JOIN public.application_users AS u ON u.user_id = im.user_id
            WHERE im.institution_id = p_institution_id
              AND im.is_active
              AND (im.ended_at IS NULL OR im.ended_at > CURRENT_TIMESTAMP)
              AND u.is_active
              AND u.auth_user_id = (SELECT auth.uid())
       )
$$;

CREATE OR REPLACE FUNCTION app_private.is_own_student(
    p_student_id INT,
    p_institution_id INT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT (SELECT auth.uid()) IS NOT NULL
       AND EXISTS (
            SELECT 1
            FROM public.student_profiles AS sp
            JOIN public.application_users AS u ON u.user_id = sp.user_id
            JOIN public.institution_memberships AS im
              ON im.user_id = sp.user_id
             AND im.institution_id = sp.institution_id
             AND im.membership_role = 'student'
            WHERE sp.student_id = p_student_id
              AND sp.institution_id = p_institution_id
              AND im.is_active
              AND (im.ended_at IS NULL OR im.ended_at > CURRENT_TIMESTAMP)
              AND u.is_active
              AND u.auth_user_id = (SELECT auth.uid())
       )
$$;

CREATE OR REPLACE FUNCTION app_private.is_own_teacher(
    p_teacher_id INT,
    p_institution_id INT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT (SELECT auth.uid()) IS NOT NULL
       AND EXISTS (
            SELECT 1
            FROM public.teacher_profiles AS tp
            JOIN public.application_users AS u ON u.user_id = tp.user_id
            JOIN public.institution_memberships AS im
              ON im.user_id = tp.user_id
             AND im.institution_id = tp.institution_id
             AND im.membership_role = 'teacher'
            WHERE tp.teacher_id = p_teacher_id
              AND tp.institution_id = p_institution_id
              AND im.is_active
              AND (im.ended_at IS NULL OR im.ended_at > CURRENT_TIMESTAMP)
              AND u.is_active
              AND u.auth_user_id = (SELECT auth.uid())
       )
$$;

CREATE OR REPLACE FUNCTION app_private.teaches_class(
    p_class_id INT,
    p_institution_id INT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT (SELECT auth.uid()) IS NOT NULL
       AND EXISTS (
            SELECT 1
            FROM public.teacher_class_assignments AS tca
            JOIN public.teacher_profiles AS tp
              ON tp.teacher_id = tca.teacher_id
             AND tp.institution_id = tca.institution_id
            JOIN public.application_users AS u ON u.user_id = tp.user_id
            WHERE tca.class_id = p_class_id
              AND tca.institution_id = p_institution_id
              AND (tca.ended_at IS NULL OR tca.ended_at > CURRENT_TIMESTAMP)
              AND u.is_active
              AND u.auth_user_id = (SELECT auth.uid())
       )
$$;

CREATE OR REPLACE FUNCTION app_private.is_enrolled_in_class(
    p_class_id INT,
    p_institution_id INT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT (SELECT auth.uid()) IS NOT NULL
       AND EXISTS (
            SELECT 1
            FROM public.class_enrollments AS ce
            JOIN public.student_profiles AS sp
              ON sp.student_id = ce.student_id
             AND sp.institution_id = ce.institution_id
            JOIN public.application_users AS u ON u.user_id = sp.user_id
            WHERE ce.class_id = p_class_id
              AND ce.institution_id = p_institution_id
              AND ce.enrollment_status = 'active'
              AND (ce.ended_at IS NULL OR ce.ended_at > CURRENT_TIMESTAMP)
              AND u.is_active
              AND u.auth_user_id = (SELECT auth.uid())
       )
$$;

CREATE OR REPLACE FUNCTION app_private.can_access_class(
    p_class_id INT,
    p_institution_id INT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT (SELECT auth.uid()) IS NOT NULL
       AND (
            (SELECT app_private.teaches_class(p_class_id, p_institution_id))
            OR
            (SELECT app_private.is_enrolled_in_class(p_class_id, p_institution_id))
       )
$$;

CREATE OR REPLACE FUNCTION app_private.can_view_student(
    p_student_id INT,
    p_institution_id INT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT (SELECT auth.uid()) IS NOT NULL
       AND (
            (SELECT app_private.is_own_student(p_student_id, p_institution_id))
            OR EXISTS (
                SELECT 1
                FROM public.class_enrollments AS ce
                WHERE ce.student_id = p_student_id
                  AND ce.institution_id = p_institution_id
                  AND ce.enrollment_status = 'active'
                  AND (SELECT app_private.teaches_class(ce.class_id, ce.institution_id))
            )
       )
$$;

CREATE OR REPLACE FUNCTION app_private.can_view_teacher(
    p_teacher_id INT,
    p_institution_id INT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT (SELECT auth.uid()) IS NOT NULL
       AND (
            (SELECT app_private.is_own_teacher(p_teacher_id, p_institution_id))
            OR EXISTS (
                SELECT 1
                FROM public.teacher_class_assignments AS tca
                WHERE tca.teacher_id = p_teacher_id
                  AND tca.institution_id = p_institution_id
                  AND (tca.ended_at IS NULL OR tca.ended_at > CURRENT_TIMESTAMP)
                  AND (SELECT app_private.is_enrolled_in_class(tca.class_id, tca.institution_id))
            )
       )
$$;

CREATE OR REPLACE FUNCTION app_private.can_access_material(
    p_learning_material_id INT,
    p_institution_id INT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT (SELECT auth.uid()) IS NOT NULL
       AND EXISTS (
            SELECT 1
            FROM public.learning_materials AS lm
            WHERE lm.learning_material_id = p_learning_material_id
              AND lm.institution_id = p_institution_id
              AND (
                    (SELECT app_private.teaches_class(lm.class_id, lm.institution_id))
                    OR (
                        NOT lm.is_archived
                        AND (SELECT app_private.is_enrolled_in_class(lm.class_id, lm.institution_id))
                    )
              )
       )
$$;

CREATE OR REPLACE FUNCTION app_private.can_manage_material(
    p_learning_material_id INT,
    p_institution_id INT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT (SELECT auth.uid()) IS NOT NULL
       AND EXISTS (
            SELECT 1
            FROM public.learning_materials AS lm
            WHERE lm.learning_material_id = p_learning_material_id
              AND lm.institution_id = p_institution_id
              AND (SELECT app_private.teaches_class(lm.class_id, lm.institution_id))
       )
$$;

CREATE OR REPLACE FUNCTION app_private.can_access_material_version(
    p_material_version_id INT,
    p_institution_id INT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT (SELECT auth.uid()) IS NOT NULL
       AND EXISTS (
            SELECT 1
            FROM public.learning_material_versions AS lmv
            WHERE lmv.material_version_id = p_material_version_id
              AND lmv.institution_id = p_institution_id
              AND (SELECT app_private.can_access_material(
                    lmv.learning_material_id,
                    lmv.institution_id
              ))
       )
$$;

CREATE OR REPLACE FUNCTION app_private.can_manage_material_version(
    p_material_version_id INT,
    p_institution_id INT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT (SELECT auth.uid()) IS NOT NULL
       AND EXISTS (
            SELECT 1
            FROM public.learning_material_versions AS lmv
            WHERE lmv.material_version_id = p_material_version_id
              AND lmv.institution_id = p_institution_id
              AND (SELECT app_private.can_manage_material(
                    lmv.learning_material_id,
                    lmv.institution_id
              ))
       )
$$;

CREATE OR REPLACE FUNCTION app_private.can_access_activity(
    p_activity_id INT,
    p_institution_id INT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT (SELECT auth.uid()) IS NOT NULL
       AND EXISTS (
            SELECT 1
            FROM public.academic_activities AS aa
            LEFT JOIN public.academic_activity_versions AS aav
              ON aav.activity_version_id = aa.current_version_id
             AND aav.activity_id = aa.activity_id
            WHERE aa.activity_id = p_activity_id
              AND aa.institution_id = p_institution_id
              AND (
                    (SELECT app_private.teaches_class(aa.class_id, aa.institution_id))
                    OR (
                        aav.publication_status IN ('published', 'closed')
                        AND (SELECT app_private.is_enrolled_in_class(
                            aa.class_id,
                            aa.institution_id
                        ))
                    )
              )
       )
$$;

CREATE OR REPLACE FUNCTION app_private.can_manage_activity(
    p_activity_id INT,
    p_institution_id INT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT (SELECT auth.uid()) IS NOT NULL
       AND EXISTS (
            SELECT 1
            FROM public.academic_activities AS aa
            WHERE aa.activity_id = p_activity_id
              AND aa.institution_id = p_institution_id
              AND (SELECT app_private.teaches_class(aa.class_id, aa.institution_id))
       )
$$;

CREATE OR REPLACE FUNCTION app_private.can_access_activity_version(
    p_activity_version_id INT,
    p_institution_id INT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT (SELECT auth.uid()) IS NOT NULL
       AND EXISTS (
            SELECT 1
            FROM public.academic_activity_versions AS aav
            JOIN public.academic_activities AS aa
              ON aa.activity_id = aav.activity_id
             AND aa.institution_id = aav.institution_id
            WHERE aav.activity_version_id = p_activity_version_id
              AND aav.institution_id = p_institution_id
              AND (
                    (SELECT app_private.teaches_class(aa.class_id, aa.institution_id))
                    OR (
                        aav.publication_status IN ('published', 'closed')
                        AND (SELECT app_private.is_enrolled_in_class(
                            aa.class_id,
                            aa.institution_id
                        ))
                    )
              )
       )
$$;

CREATE OR REPLACE FUNCTION app_private.can_manage_activity_version(
    p_activity_version_id INT,
    p_institution_id INT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT (SELECT auth.uid()) IS NOT NULL
       AND EXISTS (
            SELECT 1
            FROM public.academic_activity_versions AS aav
            WHERE aav.activity_version_id = p_activity_version_id
              AND aav.institution_id = p_institution_id
              AND (SELECT app_private.can_manage_activity(
                    aav.activity_id,
                    aav.institution_id
              ))
       )
$$;

CREATE OR REPLACE FUNCTION app_private.owns_conversation(
    p_conversation_id BIGINT,
    p_institution_id INT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT (SELECT auth.uid()) IS NOT NULL
       AND EXISTS (
            SELECT 1
            FROM public.assistant_conversations AS c
            WHERE c.assistant_conversation_id = p_conversation_id
              AND c.institution_id = p_institution_id
              AND (SELECT app_private.is_own_student(c.student_id, c.institution_id))
       )
$$;

CREATE OR REPLACE FUNCTION app_private.owns_message(
    p_message_id BIGINT,
    p_institution_id INT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT (SELECT auth.uid()) IS NOT NULL
       AND EXISTS (
            SELECT 1
            FROM public.assistant_messages AS m
            WHERE m.assistant_message_id = p_message_id
              AND m.institution_id = p_institution_id
              AND (SELECT app_private.owns_conversation(
                    m.assistant_conversation_id,
                    m.institution_id
              ))
       )
$$;

CREATE OR REPLACE FUNCTION app_private.owns_flashcard(
    p_flashcard_id BIGINT,
    p_institution_id INT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT (SELECT auth.uid()) IS NOT NULL
       AND EXISTS (
            SELECT 1
            FROM public.flashcards AS f
            WHERE f.flashcard_id = p_flashcard_id
              AND f.institution_id = p_institution_id
              AND (SELECT app_private.is_own_student(f.student_id, f.institution_id))
       )
$$;

CREATE OR REPLACE FUNCTION app_private.can_access_artifact(
    p_ai_artifact_id BIGINT,
    p_institution_id INT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT (SELECT auth.uid()) IS NOT NULL
       AND EXISTS (
            SELECT 1
            FROM public.ai_generated_artifacts AS a
            WHERE a.ai_artifact_id = p_ai_artifact_id
              AND a.institution_id = p_institution_id
              AND (
                    (a.student_id IS NOT NULL
                     AND (SELECT app_private.is_own_student(a.student_id, a.institution_id)))
                    OR
                    (a.student_id IS NULL
                     AND a.class_id IS NOT NULL
                     AND (SELECT app_private.can_access_class(a.class_id, a.institution_id)))
              )
       )
$$;

CREATE OR REPLACE FUNCTION app_private.can_access_attendance_session(
    p_attendance_session_id BIGINT,
    p_institution_id INT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT (SELECT auth.uid()) IS NOT NULL
       AND EXISTS (
            SELECT 1
            FROM public.attendance_sessions AS s
            WHERE s.attendance_session_id = p_attendance_session_id
              AND s.institution_id = p_institution_id
              AND (SELECT app_private.can_access_class(s.class_id, s.institution_id))
       )
$$;

CREATE OR REPLACE FUNCTION app_private.can_manage_attendance_session(
    p_attendance_session_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT (SELECT auth.uid()) IS NOT NULL
       AND EXISTS (
            SELECT 1
            FROM public.attendance_sessions AS s
            WHERE s.attendance_session_id = p_attendance_session_id
              AND (SELECT app_private.teaches_class(s.class_id, s.institution_id))
       )
$$;

CREATE OR REPLACE FUNCTION app_private.can_access_attendance_record(
    p_attendance_record_id BIGINT,
    p_institution_id INT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT (SELECT auth.uid()) IS NOT NULL
       AND EXISTS (
            SELECT 1
            FROM public.attendance_records AS r
            WHERE r.attendance_record_id = p_attendance_record_id
              AND r.institution_id = p_institution_id
              AND (
                    (SELECT app_private.is_own_student(r.student_id, r.institution_id))
                    OR
                    (SELECT app_private.can_manage_attendance_session(r.attendance_session_id))
              )
       )
$$;

CREATE OR REPLACE FUNCTION app_private.owns_prediction(p_prediction_id BIGINT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT (SELECT auth.uid()) IS NOT NULL
       AND EXISTS (
            SELECT 1
            FROM public.ml_predictions AS p
            WHERE p.ml_prediction_id = p_prediction_id
              AND (SELECT app_private.is_own_student(p.student_id, p.institution_id))
       )
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app_private FROM PUBLIC, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app_private TO authenticated, service_role;
REVOKE ALL ON FUNCTION app_private.handle_auth_user_created() FROM authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA app_private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- SQL-created tables are not safe until both grants and RLS are configured.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tablename
        FROM pg_catalog.pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', r.tablename);
    END LOOP;
END;
$$;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Identity and tenant boundary.
CREATE POLICY application_users_select_self
ON public.application_users FOR SELECT TO authenticated
USING (auth_user_id = (SELECT auth.uid()));

CREATE POLICY application_users_update_self
ON public.application_users FOR UPDATE TO authenticated
USING (auth_user_id = (SELECT auth.uid()))
WITH CHECK (auth_user_id = (SELECT auth.uid()));
GRANT UPDATE (display_name) ON public.application_users TO authenticated;

CREATE POLICY memberships_select_self
ON public.institution_memberships FOR SELECT TO authenticated
USING (user_id = (SELECT app_private.current_app_user_id()));

CREATE POLICY preferences_select_self
ON public.user_preferences FOR SELECT TO authenticated
USING (user_id = (SELECT app_private.current_app_user_id()));
CREATE POLICY preferences_insert_self
ON public.user_preferences FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT app_private.current_app_user_id()));
CREATE POLICY preferences_update_self
ON public.user_preferences FOR UPDATE TO authenticated
USING (user_id = (SELECT app_private.current_app_user_id()))
WITH CHECK (user_id = (SELECT app_private.current_app_user_id()));
CREATE POLICY preferences_delete_self
ON public.user_preferences FOR DELETE TO authenticated
USING (user_id = (SELECT app_private.current_app_user_id()));
GRANT INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;

CREATE POLICY institutions_select_member
ON public.institutions FOR SELECT TO authenticated
USING ((SELECT app_private.is_member(institution_id)));

CREATE POLICY student_profiles_select_scoped
ON public.student_profiles FOR SELECT TO authenticated
USING ((SELECT app_private.can_view_student(student_id, institution_id)));

CREATE POLICY teacher_profiles_select_scoped
ON public.teacher_profiles FOR SELECT TO authenticated
USING ((SELECT app_private.can_view_teacher(teacher_id, institution_id)));

-- Tenant catalog rows are readable by active institution members.
DO $$
DECLARE
    target TEXT;
BEGIN
    FOREACH target IN ARRAY ARRAY[
        'academic_terms',
        'subjects',
        'activity_types'
    ]
    LOOP
        EXECUTE format(
            'CREATE POLICY member_select ON public.%I FOR SELECT TO authenticated USING ((SELECT app_private.is_member(institution_id)))',
            target
        );
    END LOOP;
END;
$$;

CREATE POLICY class_offerings_select_accessible
ON public.class_offerings FOR SELECT TO authenticated
USING ((SELECT app_private.can_access_class(class_id, institution_id)));

CREATE POLICY meeting_patterns_select_accessible
ON public.class_meeting_patterns FOR SELECT TO authenticated
USING ((SELECT app_private.can_access_class(class_id, institution_id)));

CREATE POLICY teacher_assignments_select_accessible
ON public.teacher_class_assignments FOR SELECT TO authenticated
USING ((SELECT app_private.can_access_class(class_id, institution_id)));

CREATE POLICY enrollments_select_accessible
ON public.class_enrollments FOR SELECT TO authenticated
USING (
    (SELECT app_private.is_own_student(student_id, institution_id))
    OR (SELECT app_private.teaches_class(class_id, institution_id))
);

-- Teacher-authored files and learning materials.
CREATE POLICY file_assets_select_scoped
ON public.file_assets FOR SELECT TO authenticated
USING (
    uploaded_by_user_id = (SELECT app_private.current_app_user_id())
    OR EXISTS (
        SELECT 1
        FROM public.learning_material_versions AS lmv
        WHERE lmv.file_asset_id = file_assets.file_asset_id
          AND lmv.institution_id = file_assets.institution_id
          AND (SELECT app_private.can_access_material(
                lmv.learning_material_id,
                lmv.institution_id
          ))
    )
);
CREATE POLICY file_assets_insert_own
ON public.file_assets FOR INSERT TO authenticated
WITH CHECK (
    uploaded_by_user_id = (SELECT app_private.current_app_user_id())
    AND (SELECT app_private.is_member(institution_id))
);
CREATE POLICY file_assets_update_own
ON public.file_assets FOR UPDATE TO authenticated
USING (uploaded_by_user_id = (SELECT app_private.current_app_user_id()))
WITH CHECK (
    uploaded_by_user_id = (SELECT app_private.current_app_user_id())
    AND (SELECT app_private.is_member(institution_id))
);
CREATE POLICY file_assets_delete_own
ON public.file_assets FOR DELETE TO authenticated
USING (uploaded_by_user_id = (SELECT app_private.current_app_user_id()));
GRANT INSERT, UPDATE, DELETE ON public.file_assets TO authenticated;

CREATE POLICY learning_materials_select_scoped
ON public.learning_materials FOR SELECT TO authenticated
USING ((SELECT app_private.can_access_material(learning_material_id, institution_id)));
CREATE POLICY learning_materials_insert_teacher
ON public.learning_materials FOR INSERT TO authenticated
WITH CHECK (
    (SELECT app_private.is_own_teacher(created_by_teacher_id, institution_id))
    AND (SELECT app_private.teaches_class(class_id, institution_id))
);
CREATE POLICY learning_materials_update_teacher
ON public.learning_materials FOR UPDATE TO authenticated
USING ((SELECT app_private.can_manage_material(learning_material_id, institution_id)))
WITH CHECK (
    (SELECT app_private.is_own_teacher(created_by_teacher_id, institution_id))
    AND (SELECT app_private.teaches_class(class_id, institution_id))
);
CREATE POLICY learning_materials_delete_teacher
ON public.learning_materials FOR DELETE TO authenticated
USING ((SELECT app_private.can_manage_material(learning_material_id, institution_id)));
GRANT INSERT, UPDATE, DELETE ON public.learning_materials TO authenticated;

CREATE POLICY material_versions_select_scoped
ON public.learning_material_versions FOR SELECT TO authenticated
USING ((SELECT app_private.can_access_material_version(material_version_id, institution_id)));
CREATE POLICY material_versions_insert_teacher
ON public.learning_material_versions FOR INSERT TO authenticated
WITH CHECK (
    (SELECT app_private.is_own_teacher(created_by_teacher_id, institution_id))
    AND (SELECT app_private.can_manage_material(learning_material_id, institution_id))
);
GRANT INSERT ON public.learning_material_versions TO authenticated;

-- Teacher-authored academic activities and immutable versions.
CREATE POLICY academic_activities_select_scoped
ON public.academic_activities FOR SELECT TO authenticated
USING ((SELECT app_private.can_access_activity(activity_id, institution_id)));
CREATE POLICY academic_activities_insert_teacher
ON public.academic_activities FOR INSERT TO authenticated
WITH CHECK (
    (SELECT app_private.is_own_teacher(created_by_teacher_id, institution_id))
    AND (SELECT app_private.teaches_class(class_id, institution_id))
);
CREATE POLICY academic_activities_update_teacher
ON public.academic_activities FOR UPDATE TO authenticated
USING ((SELECT app_private.can_manage_activity(activity_id, institution_id)))
WITH CHECK (
    (SELECT app_private.is_own_teacher(created_by_teacher_id, institution_id))
    AND (SELECT app_private.teaches_class(class_id, institution_id))
);
CREATE POLICY academic_activities_delete_teacher
ON public.academic_activities FOR DELETE TO authenticated
USING ((SELECT app_private.can_manage_activity(activity_id, institution_id)));
GRANT INSERT, UPDATE, DELETE ON public.academic_activities TO authenticated;

CREATE POLICY activity_versions_select_scoped
ON public.academic_activity_versions FOR SELECT TO authenticated
USING ((SELECT app_private.can_access_activity_version(activity_version_id, institution_id)));
CREATE POLICY activity_versions_insert_teacher
ON public.academic_activity_versions FOR INSERT TO authenticated
WITH CHECK (
    (SELECT app_private.is_own_teacher(created_by_teacher_id, institution_id))
    AND (SELECT app_private.can_manage_activity(activity_id, institution_id))
);
GRANT INSERT ON public.academic_activity_versions TO authenticated;

CREATE POLICY activity_materials_select_scoped
ON public.activity_materials FOR SELECT TO authenticated
USING (
    (SELECT app_private.can_access_activity_version(activity_version_id, institution_id))
    AND (SELECT app_private.can_access_material_version(material_version_id, institution_id))
);
CREATE POLICY activity_materials_insert_teacher
ON public.activity_materials FOR INSERT TO authenticated
WITH CHECK (
    (SELECT app_private.can_manage_activity_version(activity_version_id, institution_id))
    AND (SELECT app_private.can_manage_material_version(material_version_id, institution_id))
);
CREATE POLICY activity_materials_update_teacher
ON public.activity_materials FOR UPDATE TO authenticated
USING ((SELECT app_private.can_manage_activity_version(activity_version_id, institution_id)))
WITH CHECK (
    (SELECT app_private.can_manage_activity_version(activity_version_id, institution_id))
    AND (SELECT app_private.can_manage_material_version(material_version_id, institution_id))
);
CREATE POLICY activity_materials_delete_teacher
ON public.activity_materials FOR DELETE TO authenticated
USING ((SELECT app_private.can_manage_activity_version(activity_version_id, institution_id)));
GRANT INSERT, UPDATE, DELETE ON public.activity_materials TO authenticated;

CREATE POLICY difficulty_rubrics_select_authenticated
ON public.difficulty_rubrics FOR SELECT TO authenticated
USING (TRUE);
CREATE POLICY difficulty_levels_select_authenticated
ON public.difficulty_levels FOR SELECT TO authenticated
USING (TRUE);
CREATE POLICY difficulty_assessments_select_scoped
ON public.activity_difficulty_assessments FOR SELECT TO authenticated
USING ((SELECT app_private.can_access_activity_version(activity_version_id, institution_id)));

-- Student-private tables. Teachers intentionally receive no policy path.
DO $$
DECLARE
    target TEXT;
BEGIN
    FOREACH target IN ARRAY ARRAY[
        'student_activity_states',
        'student_tasks',
        'task_dependencies',
        'student_time_blocks',
        'planned_study_sessions',
        'study_sessions',
        'student_notes',
        'assistant_conversations',
        'flashcard_sets',
        'flashcards',
        'flashcard_practice_attempts',
        'flashcard_review_states'
    ]
    LOOP
        EXECUTE format(
            'CREATE POLICY student_owner_select ON public.%I FOR SELECT TO authenticated USING ((SELECT app_private.is_own_student(student_id, institution_id)))',
            target
        );
        EXECUTE format(
            'CREATE POLICY student_owner_insert ON public.%I FOR INSERT TO authenticated WITH CHECK ((SELECT app_private.is_own_student(student_id, institution_id)))',
            target
        );
        EXECUTE format(
            'CREATE POLICY student_owner_update ON public.%I FOR UPDATE TO authenticated USING ((SELECT app_private.is_own_student(student_id, institution_id))) WITH CHECK ((SELECT app_private.is_own_student(student_id, institution_id)))',
            target
        );
        EXECUTE format(
            'CREATE POLICY student_owner_delete ON public.%I FOR DELETE TO authenticated USING ((SELECT app_private.is_own_student(student_id, institution_id)))',
            target
        );
        EXECUTE format(
            'GRANT INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated',
            target
        );
    END LOOP;
END;
$$;

CREATE POLICY planner_recommendations_select_own
ON public.planner_recommendations FOR SELECT TO authenticated
USING ((SELECT app_private.is_own_student(student_id, institution_id)));
CREATE POLICY planner_recommendations_update_own
ON public.planner_recommendations FOR UPDATE TO authenticated
USING ((SELECT app_private.is_own_student(student_id, institution_id)))
WITH CHECK ((SELECT app_private.is_own_student(student_id, institution_id)));
GRANT UPDATE (recommendation_status, decided_at)
ON public.planner_recommendations TO authenticated;

-- Attendance: students see their records and submit scans; assigned teachers
-- manage sessions, token hashes, official records, and correction history.
CREATE POLICY attendance_sessions_select_scoped
ON public.attendance_sessions FOR SELECT TO authenticated
USING ((SELECT app_private.can_access_class(class_id, institution_id)));
CREATE POLICY attendance_sessions_insert_teacher
ON public.attendance_sessions FOR INSERT TO authenticated
WITH CHECK (
    (SELECT app_private.is_own_teacher(opened_by_teacher_id, institution_id))
    AND (SELECT app_private.teaches_class(class_id, institution_id))
);
CREATE POLICY attendance_sessions_update_teacher
ON public.attendance_sessions FOR UPDATE TO authenticated
USING ((SELECT app_private.can_manage_attendance_session(attendance_session_id)))
WITH CHECK (
    (SELECT app_private.is_own_teacher(opened_by_teacher_id, institution_id))
    AND (SELECT app_private.teaches_class(class_id, institution_id))
);
CREATE POLICY attendance_sessions_delete_teacher
ON public.attendance_sessions FOR DELETE TO authenticated
USING ((SELECT app_private.can_manage_attendance_session(attendance_session_id)));
GRANT INSERT, UPDATE, DELETE ON public.attendance_sessions TO authenticated;

CREATE POLICY attendance_tokens_select_teacher
ON public.attendance_tokens FOR SELECT TO authenticated
USING ((SELECT app_private.can_manage_attendance_session(attendance_session_id)));
CREATE POLICY attendance_tokens_insert_teacher
ON public.attendance_tokens FOR INSERT TO authenticated
WITH CHECK ((SELECT app_private.can_manage_attendance_session(attendance_session_id)));
CREATE POLICY attendance_tokens_update_teacher
ON public.attendance_tokens FOR UPDATE TO authenticated
USING ((SELECT app_private.can_manage_attendance_session(attendance_session_id)))
WITH CHECK ((SELECT app_private.can_manage_attendance_session(attendance_session_id)));
CREATE POLICY attendance_tokens_delete_teacher
ON public.attendance_tokens FOR DELETE TO authenticated
USING ((SELECT app_private.can_manage_attendance_session(attendance_session_id)));
GRANT INSERT, UPDATE, DELETE ON public.attendance_tokens TO authenticated;

CREATE POLICY attendance_scans_select_scoped
ON public.attendance_scan_events FOR SELECT TO authenticated
USING (
    (SELECT app_private.is_own_student(student_id, institution_id))
    OR (SELECT app_private.can_manage_attendance_session(attendance_session_id))
);
CREATE POLICY attendance_scans_insert_student
ON public.attendance_scan_events FOR INSERT TO authenticated
WITH CHECK (
    (SELECT app_private.is_own_student(student_id, institution_id))
    AND (SELECT app_private.can_access_attendance_session(
        attendance_session_id,
        institution_id
    ))
);
GRANT INSERT (
    institution_id,
    attendance_session_id,
    attendance_token_id,
    student_id,
    client_event_id,
    scan_source,
    scanned_at
) ON public.attendance_scan_events TO authenticated;

CREATE POLICY attendance_records_select_scoped
ON public.attendance_records FOR SELECT TO authenticated
USING (
    (SELECT app_private.is_own_student(student_id, institution_id))
    OR (SELECT app_private.can_manage_attendance_session(attendance_session_id))
);
CREATE POLICY attendance_records_insert_teacher
ON public.attendance_records FOR INSERT TO authenticated
WITH CHECK (
    (SELECT app_private.is_own_teacher(recorded_by_teacher_id, institution_id))
    AND (SELECT app_private.can_manage_attendance_session(attendance_session_id))
);
CREATE POLICY attendance_records_update_teacher
ON public.attendance_records FOR UPDATE TO authenticated
USING ((SELECT app_private.can_manage_attendance_session(attendance_session_id)))
WITH CHECK ((SELECT app_private.can_manage_attendance_session(attendance_session_id)));
CREATE POLICY attendance_records_delete_teacher
ON public.attendance_records FOR DELETE TO authenticated
USING ((SELECT app_private.can_manage_attendance_session(attendance_session_id)));
GRANT INSERT, UPDATE, DELETE ON public.attendance_records TO authenticated;

CREATE POLICY attendance_corrections_select_scoped
ON public.attendance_corrections FOR SELECT TO authenticated
USING ((SELECT app_private.can_access_attendance_record(
    attendance_record_id,
    institution_id
)));
CREATE POLICY attendance_corrections_insert_teacher
ON public.attendance_corrections FOR INSERT TO authenticated
WITH CHECK (
    (SELECT app_private.is_own_teacher(corrected_by_teacher_id, institution_id))
    AND (SELECT app_private.can_access_attendance_record(
        attendance_record_id,
        institution_id
    ))
);
GRANT INSERT ON public.attendance_corrections TO authenticated;

-- AI artifacts may be student-private or class-scoped; private assistant data
-- remains owner-only through its conversation.
CREATE POLICY ai_artifacts_select_scoped
ON public.ai_generated_artifacts FOR SELECT TO authenticated
USING ((SELECT app_private.can_access_artifact(ai_artifact_id, institution_id)));

CREATE POLICY ai_artifact_activity_sources_select_scoped
ON public.ai_artifact_activity_sources FOR SELECT TO authenticated
USING ((SELECT app_private.can_access_artifact(ai_artifact_id, institution_id)));

CREATE POLICY ai_artifact_material_sources_select_scoped
ON public.ai_artifact_material_sources FOR SELECT TO authenticated
USING ((SELECT app_private.can_access_artifact(ai_artifact_id, institution_id)));

CREATE POLICY assistant_messages_select_own
ON public.assistant_messages FOR SELECT TO authenticated
USING ((SELECT app_private.owns_conversation(
    assistant_conversation_id,
    institution_id
)));
CREATE POLICY assistant_messages_insert_user
ON public.assistant_messages FOR INSERT TO authenticated
WITH CHECK (
    message_role = 'user'
    AND ai_model_version_id IS NULL
    AND (SELECT app_private.owns_conversation(
        assistant_conversation_id,
        institution_id
    ))
);
GRANT INSERT (
    institution_id,
    assistant_conversation_id,
    message_role,
    message_body
) ON public.assistant_messages TO authenticated;

CREATE POLICY assistant_message_sources_select_own
ON public.assistant_message_sources FOR SELECT TO authenticated
USING ((SELECT app_private.owns_message(assistant_message_id, institution_id)));

CREATE POLICY flashcard_sources_select_own
ON public.flashcard_sources FOR SELECT TO authenticated
USING ((SELECT app_private.owns_flashcard(flashcard_id, institution_id)));
CREATE POLICY flashcard_sources_insert_own
ON public.flashcard_sources FOR INSERT TO authenticated
WITH CHECK (
    (SELECT app_private.owns_flashcard(flashcard_id, institution_id))
    AND (SELECT app_private.can_access_material_version(
        material_version_id,
        institution_id
    ))
);
CREATE POLICY flashcard_sources_update_own
ON public.flashcard_sources FOR UPDATE TO authenticated
USING ((SELECT app_private.owns_flashcard(flashcard_id, institution_id)))
WITH CHECK (
    (SELECT app_private.owns_flashcard(flashcard_id, institution_id))
    AND (SELECT app_private.can_access_material_version(
        material_version_id,
        institution_id
    ))
);
CREATE POLICY flashcard_sources_delete_own
ON public.flashcard_sources FOR DELETE TO authenticated
USING ((SELECT app_private.owns_flashcard(flashcard_id, institution_id)));
GRANT INSERT, UPDATE, DELETE ON public.flashcard_sources TO authenticated;

-- ML outputs are readable only by the student they describe. Model artifacts
-- and training data remain service-role/private-schema only.
CREATE POLICY ml_predictions_select_own
ON public.ml_predictions FOR SELECT TO authenticated
USING ((SELECT app_private.is_own_student(student_id, institution_id)));

CREATE POLICY ml_prediction_outcomes_select_own
ON public.ml_prediction_outcomes FOR SELECT TO authenticated
USING ((SELECT app_private.owns_prediction(ml_prediction_id)));

-- Offline operations and notifications are scoped to the current app user.
CREATE POLICY sync_operations_select_own
ON public.sync_operations FOR SELECT TO authenticated
USING (user_id = (SELECT app_private.current_app_user_id()));
CREATE POLICY sync_operations_insert_own
ON public.sync_operations FOR INSERT TO authenticated
WITH CHECK (
    user_id = (SELECT app_private.current_app_user_id())
    AND (SELECT app_private.is_member(institution_id))
);
GRANT INSERT (
    institution_id,
    user_id,
    client_operation_id,
    device_identifier,
    operation_kind,
    operation_payload,
    occurred_at
) ON public.sync_operations TO authenticated;

CREATE POLICY notifications_select_own
ON public.notifications FOR SELECT TO authenticated
USING (recipient_user_id = (SELECT app_private.current_app_user_id()));
CREATE POLICY notifications_update_own
ON public.notifications FOR UPDATE TO authenticated
USING (recipient_user_id = (SELECT app_private.current_app_user_id()))
WITH CHECK (recipient_user_id = (SELECT app_private.current_app_user_id()));
GRANT UPDATE (read_at) ON public.notifications TO authenticated;

COMMIT;
