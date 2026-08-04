{{ config(materialized='materialized_view') }}

WITH attempt_weekly AS (
    SELECT
        DATE_TRUNC('week', a.created_at)::date AS week_start_date,
        a.student_id,
        mp.skill_id,
        COUNT(*) AS total_answer_attempts,
        COUNT(*) FILTER (WHERE a.is_correct IS TRUE) AS correct_attempts,
        COUNT(*) FILTER (WHERE a.is_correct IS FALSE) AS wrong_attempts,
        AVG(a.score) AS avg_score,
        AVG(a.time_spent_seconds::numeric) AS avg_time_spent_seconds
    FROM {{ source('lemma', 'student_attempts') }} AS a
    JOIN {{ source('lemma', 'math_problems') }} AS mp
        ON mp.problem_id = a.problem_id
    GROUP BY
        DATE_TRUNC('week', a.created_at)::date,
        a.student_id,
        mp.skill_id
),
attempt_hint AS (
    SELECT
        ast.attempt_id,
        BOOL_OR(ast.hint_used > 0) AS used_hint
    FROM {{ source('lemma', 'attempt_steps') }} AS ast
    GROUP BY ast.attempt_id
),
hint_weekly AS (
    SELECT
        DATE_TRUNC('week', a.created_at)::date AS week_start_date,
        a.student_id,
        mp.skill_id,
        COUNT(*) FILTER (WHERE ah.used_hint IS TRUE) AS hinted_attempt_count
    FROM {{ source('lemma', 'student_attempts') }} AS a
    JOIN {{ source('lemma', 'math_problems') }} AS mp
        ON mp.problem_id = a.problem_id
    JOIN attempt_hint AS ah
        ON ah.attempt_id = a.attempt_id
    GROUP BY
        DATE_TRUNC('week', a.created_at)::date,
        a.student_id,
        mp.skill_id
),
help_weekly AS (
    SELECT
        DATE_TRUNC('week', h.created_at)::date AS week_start_date,
        h.student_id,
        h.skill_id,
        COUNT(*) AS help_request_count
    FROM {{ source('lemma', 'student_help_events') }} AS h
    WHERE h.skill_id IS NOT NULL
    GROUP BY
        DATE_TRUNC('week', h.created_at)::date,
        h.student_id,
        h.skill_id
),
dda_weekly AS (
    SELECT
        DATE_TRUNC('week', d.created_at)::date AS week_start_date,
        d.student_id,
        d.skill_id,
        COUNT(*) AS dda_trigger_count
    FROM {{ source('lemma', 'dda_events') }} AS d
    GROUP BY
        DATE_TRUNC('week', d.created_at)::date,
        d.student_id,
        d.skill_id
),
show_me_weekly AS (
    SELECT
        DATE_TRUNC('week', b.created_at)::date AS week_start_date,
        s.student_id,
        b.skill_id,
        COUNT(*) AS show_me_count
    FROM {{ source('lemma', 'show_me_breakdowns') }} AS b
    JOIN {{ source('lemma', 'ai_sessions') }} AS s
        ON s.session_id = b.session_id
    GROUP BY
        DATE_TRUNC('week', b.created_at)::date,
        s.student_id,
        b.skill_id
),
activity_keys AS (
    SELECT a.week_start_date, a.student_id, a.skill_id FROM attempt_weekly AS a
    UNION
    SELECT h.week_start_date, h.student_id, h.skill_id FROM hint_weekly AS h
    UNION
    SELECT h.week_start_date, h.student_id, h.skill_id FROM help_weekly AS h
    UNION
    SELECT d.week_start_date, d.student_id, d.skill_id FROM dda_weekly AS d
    UNION
    SELECT b.week_start_date, b.student_id, b.skill_id FROM show_me_weekly AS b
)
SELECT
    k.week_start_date,
    k.student_id,
    k.skill_id,
    ms.skill_name,
    mt.topic_name,
    COALESCE(aw.total_answer_attempts, 0) AS total_answer_attempts,
    COALESCE(aw.correct_attempts, 0) AS correct_attempts,
    COALESCE(aw.wrong_attempts, 0) AS wrong_attempts,
    aw.avg_score,
    aw.avg_time_spent_seconds,
    COALESCE(hw.hinted_attempt_count, 0) AS hinted_attempt_count,
    CASE
        WHEN COALESCE(aw.total_answer_attempts, 0) = 0 THEN NULL
        ELSE ROUND(
            COALESCE(hw.hinted_attempt_count, 0)::numeric
            / aw.total_answer_attempts::numeric,
            4
        )
    END AS hint_usage_rate,
    COALESCE(he.help_request_count, 0) AS help_request_count,
    CASE
        WHEN COALESCE(aw.total_answer_attempts, 0)
             + COALESCE(he.help_request_count, 0) = 0 THEN NULL
        ELSE ROUND(
            COALESCE(he.help_request_count, 0)::numeric
            / (
                COALESCE(aw.total_answer_attempts, 0)
                + COALESCE(he.help_request_count, 0)
            )::numeric,
            4
        )
    END AS help_request_rate,
    COALESCE(dw.dda_trigger_count, 0) AS dda_trigger_count,
    COALESCE(sw.show_me_count, 0) AS show_me_count,
    CASE
        WHEN COALESCE(aw.total_answer_attempts, 0) = 0 THEN NULL
        ELSE ROUND(
            COALESCE(aw.correct_attempts, 0)::numeric
            / aw.total_answer_attempts::numeric,
            4
        )
    END AS accuracy_rate,
    prediction.predicted_mastery_score AS latest_predicted_mastery_score,
    prediction.risk_level AS latest_risk_level,
    prediction.recommended_action,
    prediction.predicted_at AS latest_prediction_at
FROM activity_keys AS k
JOIN {{ source('lemma', 'math_skills') }} AS ms
    ON ms.skill_id = k.skill_id
LEFT JOIN {{ source('lemma', 'math_topics') }} AS mt
    ON mt.topic_id = ms.topic_id
LEFT JOIN attempt_weekly AS aw
    ON aw.week_start_date = k.week_start_date
   AND aw.student_id = k.student_id
   AND aw.skill_id = k.skill_id
LEFT JOIN hint_weekly AS hw
    ON hw.week_start_date = k.week_start_date
   AND hw.student_id = k.student_id
   AND hw.skill_id = k.skill_id
LEFT JOIN help_weekly AS he
    ON he.week_start_date = k.week_start_date
   AND he.student_id = k.student_id
   AND he.skill_id = k.skill_id
LEFT JOIN dda_weekly AS dw
    ON dw.week_start_date = k.week_start_date
   AND dw.student_id = k.student_id
   AND dw.skill_id = k.skill_id
LEFT JOIN show_me_weekly AS sw
    ON sw.week_start_date = k.week_start_date
   AND sw.student_id = k.student_id
   AND sw.skill_id = k.skill_id
LEFT JOIN LATERAL (
    SELECT
        p.predicted_mastery_score,
        p.risk_level,
        p.recommended_action,
        p.predicted_at
    FROM {{ source('lemma', 'student_skill_predictions') }} AS p
    WHERE p.student_id = k.student_id
      AND p.skill_id = k.skill_id
      AND p.predicted_at < (k.week_start_date::timestamp + INTERVAL '7 days')
    ORDER BY p.predicted_at DESC, p.prediction_id DESC
    LIMIT 1
) AS prediction ON TRUE
