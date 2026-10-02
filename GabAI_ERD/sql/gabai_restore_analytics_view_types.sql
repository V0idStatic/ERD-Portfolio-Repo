-- Restore the intended analytics object types after the temporary public-table
-- conversion: vw_* is an ordinary read-only view and mv_* is materialized.

BEGIN;

DROP FUNCTION IF EXISTS app_private.refresh_ml_activity_effort_training();
DROP FUNCTION IF EXISTS app_private.refresh_ml_student_behavior_features();

DROP TABLE IF EXISTS public.vw_ml_activity_effort_training;
DROP TABLE IF EXISTS public.mv_ml_student_behavior_features;

DROP MATERIALIZED VIEW IF EXISTS analytics.mv_ml_student_behavior_features;

CREATE MATERIALIZED VIEW analytics.mv_ml_student_behavior_features AS
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
    calculated_at AS refreshed_at
FROM public.vw_ml_student_behavior_features_live
WITH DATA;

CREATE UNIQUE INDEX uq_mv_ml_student_behavior_features_tenant_student
    ON analytics.mv_ml_student_behavior_features (institution_id, student_id);

COMMENT ON MATERIALIZED VIEW analytics.mv_ml_student_behavior_features IS
'[MV-ML-CACHE] Private materialized Student analytics features. Refresh explicitly; never expose directly to clients.';

ALTER VIEW analytics.vw_ml_activity_effort_training
    SET (security_invoker = true);

REVOKE ALL ON SCHEMA analytics FROM PUBLIC, anon, authenticated;
REVOKE ALL ON analytics.mv_ml_student_behavior_features
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON analytics.vw_ml_activity_effort_training
FROM PUBLIC, anon, authenticated;

GRANT USAGE ON SCHEMA analytics TO service_role;
GRANT SELECT ON
    analytics.mv_ml_student_behavior_features,
    analytics.vw_ml_activity_effort_training
TO service_role;

COMMIT;

-- Refresh without blocking readers after the unique index exists:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_ml_student_behavior_features;
