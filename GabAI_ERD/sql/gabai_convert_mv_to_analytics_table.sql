-- Convert the private ML materialized view into a visible persisted table.
-- The table is cached storage: analytics reads do not rerun the aggregation.

BEGIN;

CREATE TABLE public.analytics_student_behavior_features (
    institution_id INT NOT NULL,
    student_id INT NOT NULL,
    completed_activity_count INT NOT NULL,
    avg_activity_completion_minutes NUMERIC,
    on_time_completion_rate NUMERIC,
    study_session_count_30d INT NOT NULL,
    avg_focused_minutes_30d NUMERIC,
    study_session_completion_rate_30d NUMERIC,
    flashcard_attempt_count_30d INT NOT NULL,
    flashcard_known_rate_30d NUMERIC,
    refreshed_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (institution_id, student_id),
    CONSTRAINT fk_analytics_features_student_tenant
        FOREIGN KEY (student_id, institution_id)
        REFERENCES public.student_profiles(student_id, institution_id)
        ON DELETE CASCADE
);

INSERT INTO public.analytics_student_behavior_features (
    institution_id,
    student_id,
    completed_activity_count,
    avg_activity_completion_minutes,
    on_time_completion_rate,
    study_session_count_30d,
    avg_focused_minutes_30d,
    study_session_completion_rate_30d,
    flashcard_attempt_count_30d,
    flashcard_known_rate_30d,
    refreshed_at
)
SELECT
    institution_id,
    student_id,
    completed_activity_count,
    avg_activity_completion_minutes,
    on_time_completion_rate,
    study_session_count_30d,
    avg_focused_minutes_30d,
    study_session_completion_rate_30d,
    flashcard_attempt_count_30d,
    flashcard_known_rate_30d,
    CURRENT_TIMESTAMP
FROM public.vw_ml_student_behavior_features_live;

ALTER TABLE public.analytics_student_behavior_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_student_behavior_features FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.analytics_student_behavior_features FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.analytics_student_behavior_features TO service_role;

CREATE POLICY analytics_features_deny_client_access
ON public.analytics_student_behavior_features FOR SELECT TO authenticated
USING (FALSE);

COMMENT ON TABLE public.analytics_student_behavior_features IS
'[TABLE-ML-CACHE] Persisted Student analytics features. Refresh through app_private.refresh_ml_student_behavior_features(); never expose directly to clients.';

CREATE OR REPLACE FUNCTION app_private.refresh_ml_student_behavior_features()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    refreshed_rows BIGINT;
BEGIN
    DELETE FROM public.analytics_student_behavior_features;

    INSERT INTO public.analytics_student_behavior_features (
        institution_id,
        student_id,
        completed_activity_count,
        avg_activity_completion_minutes,
        on_time_completion_rate,
        study_session_count_30d,
        avg_focused_minutes_30d,
        study_session_completion_rate_30d,
        flashcard_attempt_count_30d,
        flashcard_known_rate_30d,
        refreshed_at
    )
    SELECT
        institution_id,
        student_id,
        completed_activity_count,
        avg_activity_completion_minutes,
        on_time_completion_rate,
        study_session_count_30d,
        avg_focused_minutes_30d,
        study_session_completion_rate_30d,
        flashcard_attempt_count_30d,
        flashcard_known_rate_30d,
        CURRENT_TIMESTAMP
    FROM public.vw_ml_student_behavior_features_live;

    GET DIAGNOSTICS refreshed_rows = ROW_COUNT;
    RETURN refreshed_rows;
END;
$$;

REVOKE ALL ON FUNCTION app_private.refresh_ml_student_behavior_features()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION app_private.refresh_ml_student_behavior_features()
TO service_role;

DROP MATERIALIZED VIEW analytics.mv_ml_student_behavior_features;

COMMIT;
