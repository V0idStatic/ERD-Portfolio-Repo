-- GabAI CQRS read models for PostgreSQL / Supabase
--
-- Deployment order:
--   1. sql/gabai_liamerd.sql
--   2. sql/gabai_supabase_auth_rls.sql
--   3. sql/gabai_read_models.sql
--
-- Operational views use security_invoker so the querying role's permissions
-- and the underlying Supabase RLS policies continue to apply.
--
-- The analytics schema is intentionally not exposed to anon/authenticated.
-- Its materialized view contains private cross-row Student aggregates and is
-- intended only for trusted server-side ML/analytics jobs.
--
-- NAMING / LABEL LEGEND
--   vw_*       = ordinary live view; query runs against current base tables
--   vw_ml_*    = ordinary live view specifically used by ML workflows
--   mv_ml_*    = stored ML read model; values remain cached until refreshed
--
-- READ MODEL CATALOG
--   VW-OPS-STUDENT  vw_student_upcoming_activities
--                   Current published activities and AI difficulty.
--   VW-OPS-STUDENT  vw_student_weekly_plan
--                   Current-week private Student schedule.
--   VW-OPS-STUDENT  vw_student_progress
--                   Live Student progress/dashboard totals.
--   VW-OPS-STUDENT  vw_student_attendance
--                   Final official Student attendance only.
--   VW-OPS-TEACHER  vw_teacher_class_activities
--                   Assigned classes, current activities, and AI assessment state.
--   VW-OPS-TEACHER  vw_teacher_attendance_summary
--                   Final attendance counts for assigned classes.
--   VW-ML-LIVE      vw_ml_student_behavior_features_live
--                   Current aggregates used when making a new prediction.
--   MV-ML-CACHE     analytics.mv_ml_student_behavior_features
--                   Cached copy for trusted repeated inference/analytics reads.
--   VW-ML-TRAINING  analytics.vw_ml_activity_effort_training
--                   Historical prediction/outcome rows for regression training.

BEGIN;

CREATE SCHEMA IF NOT EXISTS analytics;

REVOKE ALL ON SCHEMA analytics FROM PUBLIC;
REVOKE ALL ON SCHEMA analytics FROM anon, authenticated;

-- ============================================================================
-- 1. STUDENT OPERATIONAL READ MODELS
-- ============================================================================

-- One row represents one published activity visible through one active Student
-- enrollment, with the Student's private execution state and the current AI
-- assessment for the exact current activity version.
-- LABEL: VW-OPS-STUDENT
-- PURPOSE: Current published activities, exact-version AI difficulty, and the
-- Student's own execution state for the upcoming-work dashboard.
CREATE OR REPLACE VIEW vw_student_upcoming_activities
WITH (security_invoker = true)
AS
SELECT
    ce.institution_id,
    ce.student_id,
    ce.class_id,
    co.class_code,
    co.class_name,
    s.subject_id,
    s.subject_code,
    s.subject_name,
    aa.activity_id,
    aav.activity_version_id,
    aav.version_number AS activity_version_number,
    at.activity_type_id,
    at.type_code AS activity_type_code,
    at.type_label AS activity_type_label,
    aav.title,
    aav.instructions,
    aav.due_at,
    aav.teacher_estimated_minutes,
    ada.difficulty_assessment_id,
    ada.standardized_score AS ai_standardized_difficulty_score,
    dl.level_code AS ai_difficulty_level_code,
    dl.level_label AS ai_difficulty_level_label,
    ada.assessed_at AS difficulty_assessed_at,
    COALESCE(sas.activity_status, 'not_started') AS student_activity_status,
    sas.personal_priority,
    sas.started_at,
    sas.completed_at,
    CASE
        WHEN aav.due_at IS NOT NULL
             AND aav.due_at < CURRENT_TIMESTAMP
             AND COALESCE(sas.activity_status, 'not_started') <> 'completed'
        THEN TRUE
        ELSE FALSE
    END AS is_overdue,
    CASE
        WHEN aav.due_at IS NULL THEN NULL
        ELSE FLOOR(EXTRACT(EPOCH FROM (aav.due_at - CURRENT_TIMESTAMP)) / 86400.0)::INT
    END AS days_until_due
FROM class_enrollments ce
JOIN class_offerings co
    ON co.class_id = ce.class_id
   AND co.institution_id = ce.institution_id
JOIN subjects s
    ON s.subject_id = co.subject_id
   AND s.institution_id = co.institution_id
JOIN academic_activities aa
    ON aa.class_id = ce.class_id
   AND aa.institution_id = ce.institution_id
JOIN academic_activity_versions aav
    ON aav.activity_version_id = aa.current_version_id
   AND aav.activity_id = aa.activity_id
   AND aav.institution_id = aa.institution_id
JOIN activity_types at
    ON at.activity_type_id = aa.activity_type_id
   AND at.institution_id = aa.institution_id
LEFT JOIN student_activity_states sas
    ON sas.student_id = ce.student_id
   AND sas.activity_id = aa.activity_id
   AND sas.institution_id = ce.institution_id
LEFT JOIN activity_difficulty_assessments ada
    ON ada.activity_version_id = aav.activity_version_id
   AND ada.institution_id = aav.institution_id
   AND ada.superseded_at IS NULL
LEFT JOIN difficulty_levels dl
    ON dl.difficulty_rubric_id = ada.difficulty_rubric_id
   AND dl.standardized_score = ada.standardized_score
WHERE ce.enrollment_status = 'active'
  AND aav.publication_status = 'published'
  AND COALESCE(sas.activity_status, 'not_started') NOT IN ('completed', 'skipped');

COMMENT ON VIEW vw_student_upcoming_activities IS
'[VW-OPS-STUDENT] Live activity dashboard. Official activity data, AI difficulty, and private Student state remain distinguishable.';

-- One row represents one scheduled study session in the Student's current
-- calendar week, including the task and optional recommendation that produced it.
-- LABEL: VW-OPS-STUDENT
-- PURPOSE: Current-week private schedule combining accepted AI recommendations
-- and Student-created planning decisions.
CREATE OR REPLACE VIEW vw_student_weekly_plan
WITH (security_invoker = true)
AS
SELECT
    pss.institution_id,
    pss.student_id,
    pss.planned_session_id,
    pss.student_task_id,
    st.task_kind,
    st.task_origin,
    st.title AS task_title,
    st.task_status,
    st.activity_id,
    aav.activity_version_id,
    aav.title AS activity_title,
    pss.scheduled_start_at,
    pss.scheduled_start_at + (pss.planned_minutes * INTERVAL '1 minute') AS scheduled_end_at,
    pss.planned_minutes,
    pss.planning_source,
    pss.session_status,
    pr.planner_recommendation_id,
    pr.reason_code AS recommendation_reason_code,
    pr.explanation AS recommendation_explanation,
    COALESCE(pr.has_conflict, FALSE) AS has_conflict
FROM planned_study_sessions pss
JOIN student_tasks st
    ON st.student_task_id = pss.student_task_id
   AND st.student_id = pss.student_id
   AND st.institution_id = pss.institution_id
LEFT JOIN academic_activities aa
    ON aa.activity_id = st.activity_id
   AND aa.institution_id = st.institution_id
LEFT JOIN academic_activity_versions aav
    ON aav.activity_version_id = aa.current_version_id
   AND aav.activity_id = aa.activity_id
LEFT JOIN planner_recommendations pr
    ON pr.planner_recommendation_id = pss.planner_recommendation_id
   AND pr.student_task_id = pss.student_task_id
   AND pr.student_id = pss.student_id
   AND pr.institution_id = pss.institution_id
WHERE pss.scheduled_start_at >= DATE_TRUNC('week', CURRENT_TIMESTAMP)
  AND pss.scheduled_start_at < DATE_TRUNC('week', CURRENT_TIMESTAMP) + INTERVAL '7 days'
  AND pss.session_status = 'scheduled';

COMMENT ON VIEW vw_student_weekly_plan IS
'[VW-OPS-STUDENT] Live private weekly plan. Teacher-authored requirements are referenced but personal scheduling remains Student-owned.';

-- One row represents one Student's live progress summary.
-- LABEL: VW-OPS-STUDENT
-- PURPOSE: Live dashboard totals for activity progress, recent study sessions,
-- and cards that are due for review.
CREATE OR REPLACE VIEW vw_student_progress
WITH (security_invoker = true)
AS
WITH activity_progress AS (
    SELECT
        sas.institution_id,
        sas.student_id,
        COUNT(*)::INT AS tracked_activity_count,
        COUNT(*) FILTER (WHERE sas.activity_status = 'completed')::INT
            AS completed_activity_count,
        COUNT(*) FILTER (WHERE sas.activity_status = 'in_progress')::INT
            AS in_progress_activity_count,
        COALESCE(SUM(sas.actual_completion_minutes)
            FILTER (WHERE sas.activity_status = 'completed'), 0)::BIGINT
            AS total_activity_minutes,
        ROUND(AVG(sas.actual_completion_minutes)
            FILTER (WHERE sas.activity_status = 'completed'), 2)
            AS avg_activity_completion_minutes,
        ROUND(
            AVG(
                CASE
                    WHEN sas.activity_status = 'completed'
                         AND aav.due_at IS NOT NULL
                    THEN CASE WHEN sas.completed_at <= aav.due_at THEN 1.0 ELSE 0.0 END
                    ELSE NULL
                END
            ),
            5
        ) AS on_time_completion_rate
    FROM student_activity_states sas
    LEFT JOIN academic_activity_versions aav
        ON aav.activity_version_id = sas.completed_against_version_id
       AND aav.activity_id = sas.activity_id
       AND aav.institution_id = sas.institution_id
    GROUP BY sas.institution_id, sas.student_id
),
recent_study AS (
    SELECT
        ss.institution_id,
        ss.student_id,
        COUNT(*)::INT AS study_session_count_30d,
        COALESCE(SUM(ss.focused_minutes), 0)::BIGINT AS focused_minutes_30d,
        ROUND(AVG(ss.focused_minutes), 2) AS avg_focused_minutes_30d,
        ROUND(
            AVG(CASE WHEN ss.outcome_status = 'completed' THEN 1.0 ELSE 0.0 END),
            5
        ) AS study_session_completion_rate_30d
    FROM study_sessions ss
    WHERE ss.started_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
    GROUP BY ss.institution_id, ss.student_id
),
flashcard_progress AS (
    SELECT
        frs.institution_id,
        frs.student_id,
        COUNT(*) FILTER (
            WHERE frs.next_review_at IS NOT NULL
              AND frs.next_review_at <= CURRENT_TIMESTAMP
              AND f.is_removed = FALSE
        )::INT AS flashcards_due_count,
        MAX(frs.last_reviewed_at) AS last_flashcard_reviewed_at
    FROM flashcard_review_states frs
    JOIN flashcards f
        ON f.flashcard_id = frs.flashcard_id
       AND f.student_id = frs.student_id
       AND f.institution_id = frs.institution_id
    GROUP BY frs.institution_id, frs.student_id
)
SELECT
    sp.institution_id,
    sp.student_id,
    COALESCE(ap.tracked_activity_count, 0) AS tracked_activity_count,
    COALESCE(ap.completed_activity_count, 0) AS completed_activity_count,
    COALESCE(ap.in_progress_activity_count, 0) AS in_progress_activity_count,
    COALESCE(ap.total_activity_minutes, 0) AS total_activity_minutes,
    ap.avg_activity_completion_minutes,
    ap.on_time_completion_rate,
    COALESCE(rs.study_session_count_30d, 0) AS study_session_count_30d,
    COALESCE(rs.focused_minutes_30d, 0) AS focused_minutes_30d,
    rs.avg_focused_minutes_30d,
    rs.study_session_completion_rate_30d,
    COALESCE(fp.flashcards_due_count, 0) AS flashcards_due_count,
    fp.last_flashcard_reviewed_at,
    CURRENT_TIMESTAMP AS calculated_at
FROM student_profiles sp
LEFT JOIN activity_progress ap
    ON ap.student_id = sp.student_id
   AND ap.institution_id = sp.institution_id
LEFT JOIN recent_study rs
    ON rs.student_id = sp.student_id
   AND rs.institution_id = sp.institution_id
LEFT JOIN flashcard_progress fp
    ON fp.student_id = sp.student_id
   AND fp.institution_id = sp.institution_id;

COMMENT ON VIEW vw_student_progress IS
'[VW-OPS-STUDENT] Live Student-only progress summary. It contains no official grade and does not expose private behavior to Teachers.';

-- One row represents one finalized attendance result visible to its Student.
-- Raw scan events are intentionally excluded.
-- LABEL: VW-OPS-STUDENT
-- PURPOSE: Student attendance history from final official records only.
CREATE OR REPLACE VIEW vw_student_attendance
WITH (security_invoker = true)
AS
SELECT
    ar.institution_id,
    ar.student_id,
    ar.attendance_record_id,
    ats.attendance_session_id,
    ats.class_id,
    co.class_code,
    co.class_name,
    s.subject_id,
    s.subject_code,
    s.subject_name,
    ats.session_title,
    ats.opens_at,
    ats.closes_at,
    ar.attendance_status,
    ar.record_source,
    ar.finalized_at,
    ar.updated_at
FROM attendance_records ar
JOIN attendance_sessions ats
    ON ats.attendance_session_id = ar.attendance_session_id
   AND ats.institution_id = ar.institution_id
JOIN class_offerings co
    ON co.class_id = ats.class_id
   AND co.institution_id = ats.institution_id
JOIN subjects s
    ON s.subject_id = co.subject_id
   AND s.institution_id = co.institution_id;

COMMENT ON VIEW vw_student_attendance IS
'[VW-OPS-STUDENT] Official Student attendance only. Provisional QR/offline scan evidence is deliberately excluded.';

-- ============================================================================
-- 2. TEACHER OPERATIONAL READ MODELS
-- ============================================================================

-- One row represents one current activity in a class assigned to one Teacher.
-- It exposes official content and assessment readiness, not individual private
-- Student planning or behavior.
-- LABEL: VW-OPS-TEACHER
-- PURPOSE: Current activity content and standardized AI assessment readiness
-- for classes assigned to a Teacher.
CREATE OR REPLACE VIEW vw_teacher_class_activities
WITH (security_invoker = true)
AS
SELECT
    tca.institution_id,
    tca.teacher_id,
    tca.class_id,
    co.class_code,
    co.class_name,
    s.subject_id,
    s.subject_code,
    s.subject_name,
    aa.activity_id,
    aav.activity_version_id,
    aav.version_number AS activity_version_number,
    at.activity_type_id,
    at.type_code AS activity_type_code,
    at.type_label AS activity_type_label,
    aav.title,
    aav.instructions,
    aav.due_at,
    aav.teacher_estimated_minutes,
    aav.publication_status,
    aav.published_at,
    ada.difficulty_assessment_id,
    ada.standardized_score AS ai_standardized_difficulty_score,
    dl.level_code AS ai_difficulty_level_code,
    dl.level_label AS ai_difficulty_level_label,
    ada.assessed_at AS difficulty_assessed_at,
    (ada.difficulty_assessment_id IS NULL) AS needs_difficulty_assessment,
    (
        SELECT COUNT(*)::INT
        FROM activity_materials am
        WHERE am.activity_version_id = aav.activity_version_id
          AND am.institution_id = aav.institution_id
    ) AS attached_material_count,
    aav.created_at AS version_created_at
FROM teacher_class_assignments tca
JOIN class_offerings co
    ON co.class_id = tca.class_id
   AND co.institution_id = tca.institution_id
JOIN subjects s
    ON s.subject_id = co.subject_id
   AND s.institution_id = co.institution_id
JOIN academic_activities aa
    ON aa.class_id = tca.class_id
   AND aa.institution_id = tca.institution_id
JOIN academic_activity_versions aav
    ON aav.activity_version_id = aa.current_version_id
   AND aav.activity_id = aa.activity_id
   AND aav.institution_id = aa.institution_id
JOIN activity_types at
    ON at.activity_type_id = aa.activity_type_id
   AND at.institution_id = aa.institution_id
LEFT JOIN activity_difficulty_assessments ada
    ON ada.activity_version_id = aav.activity_version_id
   AND ada.institution_id = aav.institution_id
   AND ada.superseded_at IS NULL
LEFT JOIN difficulty_levels dl
    ON dl.difficulty_rubric_id = ada.difficulty_rubric_id
   AND dl.standardized_score = ada.standardized_score
WHERE tca.ended_at IS NULL OR tca.ended_at > CURRENT_TIMESTAMP;

COMMENT ON VIEW vw_teacher_class_activities IS
'[VW-OPS-TEACHER] Current official activities for assigned Teachers, with AI assessment status and no private Student planner data.';

-- One row represents one attendance session summarized for one assigned Teacher.
-- LABEL: VW-OPS-TEACHER
-- PURPOSE: Present/late/absent/excused totals for each attendance session in an
-- assigned class, based only on final attendance records.
CREATE OR REPLACE VIEW vw_teacher_attendance_summary
WITH (security_invoker = true)
AS
SELECT
    tca.institution_id,
    tca.teacher_id,
    ats.class_id,
    co.class_code,
    co.class_name,
    s.subject_id,
    s.subject_code,
    s.subject_name,
    ats.attendance_session_id,
    ats.session_title,
    ats.opens_at,
    ats.closes_at,
    ats.session_status,
    (
        SELECT COUNT(*)::INT
        FROM class_enrollments ce
        WHERE ce.class_id = ats.class_id
          AND ce.institution_id = ats.institution_id
          AND ce.enrollment_status = 'active'
    ) AS expected_student_count,
    COUNT(ar.attendance_record_id)::INT AS finalized_record_count,
    COUNT(ar.attendance_record_id)
        FILTER (WHERE ar.attendance_status = 'present')::INT AS present_count,
    COUNT(ar.attendance_record_id)
        FILTER (WHERE ar.attendance_status = 'late')::INT AS late_count,
    COUNT(ar.attendance_record_id)
        FILTER (WHERE ar.attendance_status = 'absent')::INT AS absent_count,
    COUNT(ar.attendance_record_id)
        FILTER (WHERE ar.attendance_status = 'excused')::INT AS excused_count,
    COUNT(ar.attendance_record_id)
        FILTER (WHERE ar.record_source = 'validated_scan')::INT AS validated_scan_count
FROM teacher_class_assignments tca
JOIN attendance_sessions ats
    ON ats.class_id = tca.class_id
   AND ats.institution_id = tca.institution_id
JOIN class_offerings co
    ON co.class_id = ats.class_id
   AND co.institution_id = ats.institution_id
JOIN subjects s
    ON s.subject_id = co.subject_id
   AND s.institution_id = co.institution_id
LEFT JOIN attendance_records ar
    ON ar.attendance_session_id = ats.attendance_session_id
   AND ar.institution_id = ats.institution_id
WHERE tca.ended_at IS NULL OR tca.ended_at > CURRENT_TIMESTAMP
GROUP BY
    tca.institution_id,
    tca.teacher_id,
    ats.class_id,
    co.class_code,
    co.class_name,
    s.subject_id,
    s.subject_code,
    s.subject_name,
    ats.attendance_session_id,
    ats.session_title,
    ats.opens_at,
    ats.closes_at,
    ats.session_status;

COMMENT ON VIEW vw_teacher_attendance_summary IS
'[VW-OPS-TEACHER] Attendance summary based only on official records, not provisional scan events.';

-- ============================================================================
-- 3. LIVE STUDENT BEHAVIOR FEATURES
-- ============================================================================

-- One row represents one Student's current historical aggregates. These are
-- suitable for creating a new prediction snapshot, never for reconstructing
-- what an older prediction knew. Historical training must use ml_predictions.
-- LABEL: VW-ML-LIVE
-- PURPOSE: Current Student aggregates used to create a NEW ML prediction and
-- then copied into ml_predictions.feature_snapshot for historical correctness.
CREATE OR REPLACE VIEW vw_ml_student_behavior_features_live
WITH (security_invoker = true)
AS
WITH completed_activity_features AS (
    SELECT
        sas.institution_id,
        sas.student_id,
        COUNT(*) FILTER (WHERE sas.activity_status = 'completed')::INT
            AS completed_activity_count,
        ROUND(AVG(sas.actual_completion_minutes)
            FILTER (WHERE sas.activity_status = 'completed'), 2)
            AS avg_activity_completion_minutes,
        ROUND(
            AVG(
                CASE
                    WHEN sas.activity_status = 'completed'
                         AND aav.due_at IS NOT NULL
                    THEN CASE WHEN sas.completed_at <= aav.due_at THEN 1.0 ELSE 0.0 END
                    ELSE NULL
                END
            ),
            5
        ) AS on_time_completion_rate
    FROM student_activity_states sas
    LEFT JOIN academic_activity_versions aav
        ON aav.activity_version_id = sas.completed_against_version_id
       AND aav.activity_id = sas.activity_id
       AND aav.institution_id = sas.institution_id
    GROUP BY sas.institution_id, sas.student_id
),
study_features AS (
    SELECT
        ss.institution_id,
        ss.student_id,
        COUNT(*) FILTER (
            WHERE ss.started_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
        )::INT AS study_session_count_30d,
        ROUND(AVG(ss.focused_minutes) FILTER (
            WHERE ss.started_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
        ), 2) AS avg_focused_minutes_30d,
        ROUND(
            AVG(
                CASE
                    WHEN ss.started_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
                    THEN CASE WHEN ss.outcome_status = 'completed' THEN 1.0 ELSE 0.0 END
                    ELSE NULL
                END
            ),
            5
        ) AS study_session_completion_rate_30d
    FROM study_sessions ss
    GROUP BY ss.institution_id, ss.student_id
),
practice_features AS (
    SELECT
        fpa.institution_id,
        fpa.student_id,
        COUNT(*) FILTER (
            WHERE fpa.attempted_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
        )::INT AS flashcard_attempt_count_30d,
        ROUND(
            AVG(
                CASE
                    WHEN fpa.attempted_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
                    THEN CASE WHEN fpa.response_rating = 'known' THEN 1.0 ELSE 0.0 END
                    ELSE NULL
                END
            ),
            5
        ) AS flashcard_known_rate_30d
    FROM flashcard_practice_attempts fpa
    GROUP BY fpa.institution_id, fpa.student_id
)
SELECT
    sp.institution_id,
    sp.student_id,
    COALESCE(caf.completed_activity_count, 0) AS completed_activity_count,
    caf.avg_activity_completion_minutes,
    caf.on_time_completion_rate,
    COALESCE(sf.study_session_count_30d, 0) AS study_session_count_30d,
    sf.avg_focused_minutes_30d,
    sf.study_session_completion_rate_30d,
    COALESCE(pf.flashcard_attempt_count_30d, 0) AS flashcard_attempt_count_30d,
    pf.flashcard_known_rate_30d,
    CURRENT_TIMESTAMP AS calculated_at
FROM student_profiles sp
LEFT JOIN completed_activity_features caf
    ON caf.student_id = sp.student_id
   AND caf.institution_id = sp.institution_id
LEFT JOIN study_features sf
    ON sf.student_id = sp.student_id
   AND sf.institution_id = sp.institution_id
LEFT JOIN practice_features pf
    ON pf.student_id = sp.student_id
   AND pf.institution_id = sp.institution_id;

COMMENT ON VIEW vw_ml_student_behavior_features_live IS
'[VW-ML-LIVE] Current private Student aggregates for new ML predictions. Never use it to reconstruct a past prediction.';

-- ============================================================================
-- 4. PRIVATE ANALYTICS READ MODELS
-- ============================================================================

-- One row represents one Student's cached current behavior features. This is a
-- performance/read-model cache, never the source of truth and never the record
-- of features used by a historical prediction.
-- LABEL: MV-ML-CACHE
-- PURPOSE: Cached version of the live ML feature view for repeated trusted
-- server-side inference and analytics. Refresh before jobs that need fresh data.
CREATE MATERIALIZED VIEW analytics.mv_ml_student_behavior_features
AS
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
FROM vw_ml_student_behavior_features_live
WITH DATA;

CREATE UNIQUE INDEX uq_mv_ml_student_behavior_features_tenant_student
    ON analytics.mv_ml_student_behavior_features (institution_id, student_id);

COMMENT ON MATERIALIZED VIEW analytics.mv_ml_student_behavior_features IS
'[MV-ML-CACHE] Private cached Student features for trusted ML/analytics jobs. Refresh on a schedule; never expose directly to clients.';

-- One row represents one observed completion-time prediction suitable for
-- reproducible evaluation or model training. The immutable feature_snapshot is
-- what the model actually knew; live aggregates are never substituted.
-- LABEL: VW-ML-TRAINING
-- PURPOSE: Leakage-resistant supervised-learning dataset for the activity
-- completion-minutes regression target.
CREATE OR REPLACE VIEW analytics.vw_ml_activity_effort_training
WITH (security_invoker = true)
AS
SELECT
    mp.institution_id,
    mp.ml_prediction_id,
    mp.student_id,
    mp.student_task_id,
    st.activity_id,
    aav.activity_version_id,
    aa.activity_type_id,
    at.type_code AS activity_type_code,
    mp.ml_model_version_id,
    mm.model_name,
    mm.version_identifier AS model_version_identifier,
    mp.difficulty_assessment_id,
    ada.standardized_score AS ai_standardized_difficulty_score,
    ada.assessed_at AS difficulty_assessed_at,
    mp.feature_cutoff_at,
    mp.predicted_at,
    aav.due_at,
    CASE
        WHEN aav.due_at IS NULL THEN NULL
        ELSE ROUND(
            (EXTRACT(EPOCH FROM (aav.due_at - mp.feature_cutoff_at)) / 86400.0)::NUMERIC,
            3
        )
    END AS days_until_due_at_prediction,
    mp.predicted_minutes,
    mpo.actual_minutes,
    mp.feature_snapshot,
    mpo.observed_at
FROM ml_predictions mp
JOIN ml_prediction_outcomes mpo
    ON mpo.ml_prediction_id = mp.ml_prediction_id
JOIN student_tasks st
    ON st.student_task_id = mp.student_task_id
   AND st.student_id = mp.student_id
   AND st.institution_id = mp.institution_id
JOIN ml_model_versions mm
    ON mm.ml_model_version_id = mp.ml_model_version_id
LEFT JOIN activity_difficulty_assessments ada
    ON ada.difficulty_assessment_id = mp.difficulty_assessment_id
   AND ada.institution_id = mp.institution_id
LEFT JOIN academic_activity_versions aav
    ON aav.activity_version_id = ada.activity_version_id
   AND aav.institution_id = ada.institution_id
LEFT JOIN academic_activities aa
    ON aa.activity_id = aav.activity_id
   AND aa.institution_id = aav.institution_id
LEFT JOIN activity_types at
    ON at.activity_type_id = aa.activity_type_id
   AND at.institution_id = aa.institution_id
WHERE mp.prediction_type = 'completion_minutes'
  AND mpo.actual_minutes IS NOT NULL;

COMMENT ON VIEW analytics.vw_ml_activity_effort_training IS
'[VW-ML-TRAINING] Private effort-regression training rows. Feature snapshots and exact difficulty assessments preserve prediction-time state.';

REVOKE ALL ON ALL TABLES IN SCHEMA analytics FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA analytics FROM anon, authenticated;

REVOKE ALL ON
    vw_student_upcoming_activities,
    vw_student_weekly_plan,
    vw_student_progress,
    vw_student_attendance,
    vw_teacher_class_activities,
    vw_teacher_attendance_summary
FROM PUBLIC, anon;

GRANT SELECT ON
    vw_student_upcoming_activities,
    vw_student_weekly_plan,
    vw_student_progress,
    vw_student_attendance,
    vw_teacher_class_activities,
    vw_teacher_attendance_summary
TO authenticated;

REVOKE ALL ON vw_ml_student_behavior_features_live
FROM PUBLIC, anon, authenticated;
GRANT SELECT ON vw_ml_student_behavior_features_live TO service_role;

COMMIT;

-- Base-table grants and RLS policies live in gabai_supabase_auth_rls.sql. These
-- security-invoker views apply those same policies to every underlying row.

-- Scheduled refresh recipe for the private ML feature cache:
--
-- REFRESH MATERIALIZED VIEW CONCURRENTLY
--     analytics.mv_ml_student_behavior_features;
--
-- ANALYZE analytics.mv_ml_student_behavior_features;
