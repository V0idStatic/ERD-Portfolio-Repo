{{ config(materialized='view') }}

WITH feature_ranked AS (
    SELECT
        f.*,
        ROW_NUMBER() OVER (
            PARTITION BY f.student_id, f.skill_id
            ORDER BY f.updated_at DESC, f.feature_id DESC
        ) AS row_num
    FROM {{ source('lemma', 'student_skill_features') }} AS f
),
latest_feature AS (
    SELECT f.*
    FROM feature_ranked AS f
    WHERE f.row_num = 1
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
latest_prediction AS (
    SELECT p.*
    FROM prediction_ranked AS p
    WHERE p.row_num = 1
),
student_skill_keys AS (
    SELECT f.student_id, f.skill_id
    FROM latest_feature AS f
    UNION
    SELECT p.student_id, p.skill_id
    FROM latest_prediction AS p
)
SELECT
    k.student_id,
    cs.grade_level,
    k.skill_id,
    ms.skill_name,
    mt.topic_name,
    COALESCE(f.total_attempts, 0) AS total_answer_attempts,
    COALESCE(f.correct_attempts, 0) AS correct_attempts,
    GREATEST(
        COALESCE(f.total_attempts, 0) - COALESCE(f.correct_attempts, 0),
        0
    ) AS wrong_attempts,
    f.accuracy_rate,
    f.avg_time_spent,
    f.hint_usage_rate,
    COALESCE(f.help_request_count, 0) AS help_request_count,
    f.help_request_rate,
    COALESCE(f.failed_loop_count, 0) AS failed_loop_count,
    COALESCE(f.dda_trigger_count, 0) AS dda_trigger_count,
    COALESCE(f.show_me_count, 0) AS show_me_count,
    f.recent_score_avg,
    f.last_attempt_at,
    p.predicted_mastery_score,
    p.risk_level,
    dl.difficulty_name AS recommended_difficulty_name,
    dl.numerical_value AS recommended_difficulty_value,
    p.recommended_action,
    p.predicted_at
FROM student_skill_keys AS k
JOIN {{ source('lemma', 'student_profiles') }} AS sp
    ON sp.student_id = k.student_id
LEFT JOIN {{ source('lemma', 'class_sections') }} AS cs
    ON cs.section_id = sp.section_id
JOIN {{ source('lemma', 'math_skills') }} AS ms
    ON ms.skill_id = k.skill_id
LEFT JOIN {{ source('lemma', 'math_topics') }} AS mt
    ON mt.topic_id = ms.topic_id
LEFT JOIN latest_feature AS f
    ON f.student_id = k.student_id
   AND f.skill_id = k.skill_id
LEFT JOIN latest_prediction AS p
    ON p.student_id = k.student_id
   AND p.skill_id = k.skill_id
LEFT JOIN {{ source('lemma', 'difficulty_levels') }} AS dl
    ON dl.difficulty_id = p.recommended_difficulty_id
