{{ config(materialized='materialized_view') }}

WITH attempt_by_skill AS (
    SELECT
        mp.skill_id,
        COUNT(*) AS total_answer_attempts,
        COUNT(*) FILTER (WHERE a.is_correct IS TRUE) AS correct_attempts,
        COUNT(*) FILTER (WHERE a.is_correct IS FALSE) AS wrong_attempts,
        AVG(a.time_spent_seconds::numeric) AS avg_time_spent_seconds,
        COUNT(DISTINCT a.student_id) AS affected_student_count,
        MAX(a.created_at) FILTER (WHERE a.is_correct IS FALSE) AS latest_failure_at
    FROM {{ source('lemma', 'student_attempts') }} AS a
    JOIN {{ source('lemma', 'math_problems') }} AS mp
        ON mp.problem_id = a.problem_id
    GROUP BY mp.skill_id
),
step_by_skill AS (
    SELECT
        mp.skill_id,
        COUNT(*) FILTER (WHERE ast.is_step_correct IS FALSE) AS wrong_step_count,
        COUNT(*) FILTER (WHERE ast.hint_used > 0) AS hinted_step_count
    FROM {{ source('lemma', 'attempt_steps') }} AS ast
    JOIN {{ source('lemma', 'student_attempts') }} AS a
        ON a.attempt_id = ast.attempt_id
    JOIN {{ source('lemma', 'math_problems') }} AS mp
        ON mp.problem_id = a.problem_id
    GROUP BY mp.skill_id
),
help_by_skill AS (
    SELECT
        h.skill_id,
        COUNT(*) AS help_request_count
    FROM {{ source('lemma', 'student_help_events') }} AS h
    WHERE h.skill_id IS NOT NULL
    GROUP BY h.skill_id
),
dda_by_skill AS (
    SELECT
        d.skill_id,
        COUNT(*) AS dda_trigger_count
    FROM {{ source('lemma', 'dda_events') }} AS d
    GROUP BY d.skill_id
),
show_me_by_skill AS (
    SELECT
        b.skill_id,
        COUNT(*) AS show_me_count
    FROM {{ source('lemma', 'show_me_breakdowns') }} AS b
    GROUP BY b.skill_id
),
activity_skills AS (
    SELECT a.skill_id FROM attempt_by_skill AS a
    UNION
    SELECT s.skill_id FROM step_by_skill AS s
    UNION
    SELECT h.skill_id FROM help_by_skill AS h
    UNION
    SELECT d.skill_id FROM dda_by_skill AS d
    UNION
    SELECT b.skill_id FROM show_me_by_skill AS b
)
SELECT
    mt.topic_name,
    mt.grade_level,
    ms.skill_id,
    ms.skill_name,
    COALESCE(a.total_answer_attempts, 0) AS total_answer_attempts,
    COALESCE(a.correct_attempts, 0) AS correct_attempts,
    COALESCE(a.wrong_attempts, 0) AS wrong_attempts,
    CASE
        WHEN COALESCE(a.total_answer_attempts, 0) = 0 THEN NULL
        ELSE ROUND(
            COALESCE(a.wrong_attempts, 0)::numeric
            / a.total_answer_attempts::numeric,
            4
        )
    END AS failure_rate,
    a.avg_time_spent_seconds,
    COALESCE(a.affected_student_count, 0) AS affected_student_count,
    a.latest_failure_at,
    COALESCE(s.wrong_step_count, 0) AS wrong_step_count,
    COALESCE(s.hinted_step_count, 0) AS hinted_step_count,
    COALESCE(h.help_request_count, 0) AS help_request_count,
    COALESCE(d.dda_trigger_count, 0) AS dda_trigger_count,
    COALESCE(b.show_me_count, 0) AS show_me_count
FROM activity_skills AS k
JOIN {{ source('lemma', 'math_skills') }} AS ms
    ON ms.skill_id = k.skill_id
JOIN {{ source('lemma', 'math_topics') }} AS mt
    ON mt.topic_id = ms.topic_id
LEFT JOIN attempt_by_skill AS a
    ON a.skill_id = k.skill_id
LEFT JOIN step_by_skill AS s
    ON s.skill_id = k.skill_id
LEFT JOIN help_by_skill AS h
    ON h.skill_id = k.skill_id
LEFT JOIN dda_by_skill AS d
    ON d.skill_id = k.skill_id
LEFT JOIN show_me_by_skill AS b
    ON b.skill_id = k.skill_id
