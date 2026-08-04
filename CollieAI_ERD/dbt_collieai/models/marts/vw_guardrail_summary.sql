{{ config(materialized='view') }}

SELECT
    g.guardrail_id,
    s.student_id,
    m.sender,
    m.message_type,
    m.message_text,
    g.is_math_related,
    g.prompt_injection_detected,
    g.violation_type,
    g.action_taken,
    g.confidence_score,
    g.created_at AS checked_at
FROM {{ source('lemma', 'guardrail_checks') }} AS g
LEFT JOIN {{ source('lemma', 'ai_messages') }} AS m
    ON m.message_id = g.message_id
LEFT JOIN {{ source('lemma', 'ai_sessions') }} AS s
    ON s.session_id = m.session_id
