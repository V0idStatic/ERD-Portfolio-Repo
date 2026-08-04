{{ config(materialized='view') }}

WITH help_agg AS (
    SELECT
        h.session_id,
        h.student_id,
        h.skill_id,
        COUNT(*) AS related_help_event_count
    FROM {{ source('lemma', 'student_help_events') }} AS h
    GROUP BY h.session_id, h.student_id, h.skill_id
),
show_me_agg AS (
    SELECT
        b.session_id,
        b.skill_id,
        COUNT(*) AS related_show_me_count
    FROM {{ source('lemma', 'show_me_breakdowns') }} AS b
    GROUP BY b.session_id, b.skill_id
),
feature_ranked AS (
    SELECT
        f.student_id,
        f.skill_id,
        f.accuracy_rate,
        ROW_NUMBER() OVER (
            PARTITION BY f.student_id, f.skill_id
            ORDER BY f.updated_at DESC, f.feature_id DESC
        ) AS row_num
    FROM {{ source('lemma', 'student_skill_features') }} AS f
),
latest_feature AS (
    SELECT f.student_id, f.skill_id, f.accuracy_rate
    FROM feature_ranked AS f
    WHERE f.row_num = 1
),
prediction_ranked AS (
    SELECT
        p.student_id,
        p.skill_id,
        p.risk_level,
        ROW_NUMBER() OVER (
            PARTITION BY p.student_id, p.skill_id
            ORDER BY p.predicted_at DESC, p.prediction_id DESC
        ) AS row_num
    FROM {{ source('lemma', 'student_skill_predictions') }} AS p
),
latest_prediction AS (
    SELECT p.student_id, p.skill_id, p.risk_level
    FROM prediction_ranked AS p
    WHERE p.row_num = 1
)
SELECT
    d.dda_event_id,
    d.student_id,
    cs.grade_level,
    ms.skill_name,
    mt.topic_name,
    d.trigger_reason,
    previous_difficulty.difficulty_name AS previous_difficulty_name,
    previous_difficulty.numerical_value AS previous_difficulty_value,
    new_difficulty.difficulty_name AS new_difficulty_name,
    new_difficulty.numerical_value AS new_difficulty_value,
    d.visual_analogy_used,
    d.created_at AS event_created_at,
    COALESCE(ha.related_help_event_count, 0) AS related_help_event_count,
    COALESCE(sm.related_show_me_count, 0) AS related_show_me_count,
    (COALESCE(sm.related_show_me_count, 0) > 0) AS show_me_triggered,
    lf.accuracy_rate AS latest_accuracy_rate,
    lp.risk_level AS latest_risk_level
FROM {{ source('lemma', 'dda_events') }} AS d
LEFT JOIN {{ source('lemma', 'student_profiles') }} AS sp
    ON sp.student_id = d.student_id
LEFT JOIN {{ source('lemma', 'class_sections') }} AS cs
    ON cs.section_id = sp.section_id
LEFT JOIN {{ source('lemma', 'math_skills') }} AS ms
    ON ms.skill_id = d.skill_id
LEFT JOIN {{ source('lemma', 'math_topics') }} AS mt
    ON mt.topic_id = ms.topic_id
LEFT JOIN {{ source('lemma', 'difficulty_levels') }} AS previous_difficulty
    ON previous_difficulty.difficulty_id = d.previous_difficulty_id
LEFT JOIN {{ source('lemma', 'difficulty_levels') }} AS new_difficulty
    ON new_difficulty.difficulty_id = d.new_difficulty_id
LEFT JOIN help_agg AS ha
    ON ha.session_id = d.session_id
   AND ha.student_id = d.student_id
   AND ha.skill_id = d.skill_id
LEFT JOIN show_me_agg AS sm
    ON sm.session_id = d.session_id
   AND sm.skill_id = d.skill_id
LEFT JOIN latest_feature AS lf
    ON lf.student_id = d.student_id
   AND lf.skill_id = d.skill_id
LEFT JOIN latest_prediction AS lp
    ON lp.student_id = d.student_id
   AND lp.skill_id = d.skill_id
