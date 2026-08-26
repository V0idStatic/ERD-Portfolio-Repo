{{ config(materialized='materialized_view') }}

WITH session_daily AS (
    SELECT
        s.student_id,
        s.created_at::date AS performance_date,
        COUNT(*) AS sessions_started,
        COUNT(*) FILTER (WHERE s.session_status = 'completed') AS sessions_completed
    FROM {{ source('lemma', 'ai_sessions') }} AS s
    GROUP BY s.student_id, s.created_at::date
),
attempt_daily AS (
    SELECT
        a.student_id,
        a.created_at::date AS performance_date,
        COUNT(*) AS total_answer_attempts,
        COUNT(*) FILTER (WHERE a.is_correct IS TRUE) AS correct_attempts,
        COUNT(*) FILTER (WHERE a.is_correct IS FALSE) AS wrong_attempts,
        AVG(a.score) AS avg_score,
        AVG(a.time_spent_seconds::numeric) AS avg_time_spent_seconds
    FROM {{ source('lemma', 'student_attempts') }} AS a
    GROUP BY a.student_id, a.created_at::date
),
attempt_hint AS (
    SELECT
        a.attempt_id,
        a.student_id,
        a.created_at::date AS performance_date,
        BOOL_OR(ast.hint_used > 0) AS used_hint
    FROM {{ source('lemma', 'student_attempts') }} AS a
    JOIN {{ source('lemma', 'attempt_steps') }} AS ast
        ON ast.attempt_id = a.attempt_id
    GROUP BY a.attempt_id, a.student_id, a.created_at::date
),
hint_daily AS (
    SELECT
        h.student_id,
        h.performance_date,
        COUNT(*) FILTER (WHERE h.used_hint IS TRUE) AS hinted_attempt_count
    FROM attempt_hint AS h
    GROUP BY h.student_id, h.performance_date
),
help_daily AS (
    SELECT
        h.student_id,
        h.created_at::date AS performance_date,
        COUNT(*) AS help_request_count
    FROM {{ source('lemma', 'student_help_events') }} AS h
    GROUP BY h.student_id, h.created_at::date
),
dda_daily AS (
    SELECT
        d.student_id,
        d.created_at::date AS performance_date,
        COUNT(*) AS dda_trigger_count
    FROM {{ source('lemma', 'dda_events') }} AS d
    GROUP BY d.student_id, d.created_at::date
),
show_me_daily AS (
    SELECT
        s.student_id,
        b.created_at::date AS performance_date,
        COUNT(*) AS show_me_count
    FROM {{ source('lemma', 'show_me_breakdowns') }} AS b
    JOIN {{ source('lemma', 'ai_sessions') }} AS s
        ON s.session_id = b.session_id
    GROUP BY s.student_id, b.created_at::date
),
activity_keys AS (
    SELECT s.student_id, s.performance_date FROM session_daily AS s
    UNION
    SELECT a.student_id, a.performance_date FROM attempt_daily AS a
    UNION
    SELECT h.student_id, h.performance_date FROM hint_daily AS h
    UNION
    SELECT h.student_id, h.performance_date FROM help_daily AS h
    UNION
    SELECT d.student_id, d.performance_date FROM dda_daily AS d
    UNION
    SELECT b.student_id, b.performance_date FROM show_me_daily AS b
)
SELECT
    k.performance_date,
    k.student_id,
    cs.section_name,
    cs.grade_level,
    COALESCE(sd.sessions_started, 0) AS sessions_started,
    COALESCE(sd.sessions_completed, 0) AS sessions_completed,
    COALESCE(ad.total_answer_attempts, 0) AS total_answer_attempts,
    COALESCE(ad.correct_attempts, 0) AS correct_attempts,
    COALESCE(ad.wrong_attempts, 0) AS wrong_attempts,
    ad.avg_score,
    ad.avg_time_spent_seconds,
    COALESCE(hd.hinted_attempt_count, 0) AS hinted_attempt_count,
    COALESCE(he.help_request_count, 0) AS help_request_count,
    COALESCE(dd.dda_trigger_count, 0) AS dda_trigger_count, 
    COALESCE(sm.show_me_count, 0) AS show_me_count,
    CASE
        WHEN COALESCE(ad.total_answer_attempts, 0) = 0 THEN NULL
        ELSE ROUND(
            COALESCE(ad.correct_attempts, 0)::numeric
            / ad.total_answer_attempts::numeric,
            4
        )
    END AS accuracy_rate
FROM activity_keys AS k
JOIN {{ source('lemma', 'student_profiles') }} AS sp
    ON sp.student_id = k.student_id
LEFT JOIN {{ source('lemma', 'class_sections') }} AS cs
    ON cs.section_id = sp.section_id
LEFT JOIN session_daily AS sd
    ON sd.student_id = k.student_id
   AND sd.performance_date = k.performance_date
LEFT JOIN attempt_daily AS ad
    ON ad.student_id = k.student_id
   AND ad.performance_date = k.performance_date
LEFT JOIN hint_daily AS hd
    ON hd.student_id = k.student_id
   AND hd.performance_date = k.performance_date
LEFT JOIN help_daily AS he
    ON he.student_id = k.student_id
   AND he.performance_date = k.performance_date
LEFT JOIN dda_daily AS dd
    ON dd.student_id = k.student_id
   AND dd.performance_date = k.performance_date
LEFT JOIN show_me_daily AS sm
    ON sm.student_id = k.student_id
   AND sm.performance_date = k.performance_date
