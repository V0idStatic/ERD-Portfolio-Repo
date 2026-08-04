{{ config(materialized='view') }}

WITH link_ranked AS (
    SELECT
        l.*,
        ROW_NUMBER() OVER (
            PARTITION BY l.parent_id, l.student_id
            ORDER BY l.created_at DESC, l.student_parent_link_id DESC
        ) AS row_num
    FROM {{ source('lemma', 'student_parent_links') }} AS l
),
unique_link AS (
    SELECT l.*
    FROM link_ranked AS l
    WHERE l.row_num = 1
),
feature_ranked AS (
    SELECT
        f.*,
        ROW_NUMBER() OVER (
            PARTITION BY f.student_id, f.skill_id
            ORDER BY f.updated_at DESC, f.feature_id DESC
        ) AS row_num
    FROM {{ source('lemma', 'student_skill_features') }} AS f
),
feature_agg AS (
    SELECT
        f.student_id,
        SUM(f.total_attempts) AS total_answer_attempts,
        SUM(f.correct_attempts) AS correct_attempts,
        SUM(f.help_request_count) AS help_request_count,
        MAX(f.last_attempt_at) AS last_activity_at
    FROM feature_ranked AS f
    WHERE f.row_num = 1
    GROUP BY f.student_id
),
prediction_ranked AS (
    SELECT
        p.*,
        ROW_NUMBER() OVER (
            PARTITION BY p.student_id, p.skill_id
            ORDER BY p.predicted_at DESC, p.prediction_id DESC
        ) AS row_num
    FROM {{ source('lemma', 'student_skill_predictions') }} AS p
),
risk_agg AS (
    SELECT
        p.student_id,
        COUNT(*) FILTER (WHERE LOWER(p.risk_level) = 'at_risk') AS at_risk_skill_count,
        COUNT(*) FILTER (WHERE LOWER(p.risk_level) = 'needs_practice') AS needs_practice_skill_count
    FROM prediction_ranked AS p
    WHERE p.row_num = 1
    GROUP BY p.student_id
),
recommendation_agg AS (
    SELECT
        r.student_id,
        COUNT(*) FILTER (WHERE r.is_completed IS FALSE) AS active_recommendation_count,
        ((ARRAY_AGG(
            r.recommendation_text
            ORDER BY
                r.priority_level ASC,
                r.created_at DESC,
                r.recommendation_id DESC
        ) FILTER (WHERE r.is_completed IS FALSE)))[1] AS highest_priority_recommendation
    FROM {{ source('lemma', 'learning_recommendations') }} AS r
    GROUP BY r.student_id
)
SELECT
    l.parent_id,
    l.student_id,
    l.relationship_type,
    l.is_primary_guardian,
    cs.section_name,
    cs.grade_level,
    sp.learning_status,
    COALESCE(sp.current_streak, 0) AS current_streak,
    COALESCE(sp.total_star_points, 0::double precision) AS total_star_points,
    COALESCE(fa.total_answer_attempts, 0) AS total_answer_attempts,
    COALESCE(fa.correct_attempts, 0) AS correct_attempts,
    GREATEST(
        COALESCE(fa.total_answer_attempts, 0)
        - COALESCE(fa.correct_attempts, 0),
        0
    ) AS wrong_attempts,
    CASE
        WHEN COALESCE(fa.total_answer_attempts, 0) = 0 THEN NULL
        ELSE ROUND(
            COALESCE(fa.correct_attempts, 0)::numeric
            / fa.total_answer_attempts::numeric,
            4
        )
    END AS overall_accuracy_rate,
    COALESCE(fa.help_request_count, 0) AS help_request_count,
    fa.last_activity_at,
    COALESCE(rk.at_risk_skill_count, 0) AS at_risk_skill_count,
    COALESCE(rk.needs_practice_skill_count, 0) AS needs_practice_skill_count,
    COALESCE(ra.active_recommendation_count, 0) AS active_recommendation_count,
    ra.highest_priority_recommendation
FROM unique_link AS l
JOIN {{ source('lemma', 'parent_profiles') }} AS pp
    ON pp.parent_id = l.parent_id
JOIN {{ source('lemma', 'student_profiles') }} AS sp
    ON sp.student_id = l.student_id
LEFT JOIN {{ source('lemma', 'class_sections') }} AS cs
    ON cs.section_id = sp.section_id
LEFT JOIN feature_agg AS fa
    ON fa.student_id = l.student_id
LEFT JOIN risk_agg AS rk
    ON rk.student_id = l.student_id
LEFT JOIN recommendation_agg AS ra
    ON ra.student_id = l.student_id
