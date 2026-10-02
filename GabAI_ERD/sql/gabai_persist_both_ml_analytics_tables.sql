-- Make both ML analytics datasets visible as persisted public tables.
-- Client roles remain denied; trusted jobs refresh each cache explicitly.

BEGIN;

ALTER TABLE public.analytics_student_behavior_features
    RENAME TO mv_ml_student_behavior_features;

COMMENT ON TABLE public.mv_ml_student_behavior_features IS
'[MV-ML-CACHE] Persisted private Student feature cache. Refresh through app_private.refresh_ml_student_behavior_features().';

CREATE OR REPLACE FUNCTION app_private.refresh_ml_student_behavior_features()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    refreshed_rows BIGINT;
BEGIN
    DELETE FROM public.mv_ml_student_behavior_features;

    INSERT INTO public.mv_ml_student_behavior_features (
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

CREATE TABLE public.vw_ml_activity_effort_training (
    institution_id INT NOT NULL,
    ml_prediction_id BIGINT PRIMARY KEY,
    student_id INT NOT NULL,
    student_task_id BIGINT NOT NULL,
    activity_id INT,
    activity_version_id INT,
    activity_type_id INT,
    activity_type_code TEXT,
    ml_model_version_id INT NOT NULL,
    model_name TEXT NOT NULL,
    model_version_identifier TEXT NOT NULL,
    difficulty_assessment_id INT,
    ai_standardized_difficulty_score SMALLINT,
    difficulty_assessed_at TIMESTAMPTZ,
    feature_cutoff_at TIMESTAMPTZ NOT NULL,
    predicted_at TIMESTAMPTZ NOT NULL,
    due_at TIMESTAMPTZ,
    days_until_due_at_prediction NUMERIC,
    predicted_minutes INT,
    actual_minutes INT NOT NULL,
    feature_snapshot JSONB NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL
);

INSERT INTO public.vw_ml_activity_effort_training
SELECT * FROM analytics.vw_ml_activity_effort_training;

CREATE INDEX idx_ml_training_tenant_student_predicted
    ON public.vw_ml_activity_effort_training
    (institution_id, student_id, predicted_at DESC);

ALTER TABLE public.vw_ml_activity_effort_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vw_ml_activity_effort_training FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.vw_ml_activity_effort_training FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.vw_ml_activity_effort_training TO service_role;

CREATE POLICY ml_training_deny_client_access
ON public.vw_ml_activity_effort_training FOR SELECT TO authenticated
USING (FALSE);

COMMENT ON TABLE public.vw_ml_activity_effort_training IS
'[VW-ML-TRAINING-CACHE] Persisted private effort-regression training dataset. Refresh through app_private.refresh_ml_activity_effort_training().';

GRANT USAGE ON SCHEMA analytics TO service_role;
GRANT SELECT ON analytics.vw_ml_activity_effort_training TO service_role;

CREATE OR REPLACE FUNCTION app_private.refresh_ml_activity_effort_training()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    refreshed_rows BIGINT;
BEGIN
    DELETE FROM public.vw_ml_activity_effort_training;

    INSERT INTO public.vw_ml_activity_effort_training
    SELECT * FROM analytics.vw_ml_activity_effort_training;

    GET DIAGNOSTICS refreshed_rows = ROW_COUNT;
    RETURN refreshed_rows;
END;
$$;

REVOKE ALL ON FUNCTION app_private.refresh_ml_activity_effort_training()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION app_private.refresh_ml_activity_effort_training()
TO service_role;

COMMIT;
