{{ config(materialized='view') }}

with session_agg as (
    select
        student_id,
        count(*) as total_sessions,
        count(*) filter (where session_status = 'completed') as completed_sessions,
        max(coalesce(ended_at, started_at, created_at)) as last_session_at
    from {{ source('lemma', 'ai_sessions') }}
    group by student_id
),
attempt_agg as (
    select
        student_id,
        count(*) as total_answer_attempts,
        count(*) filter (where is_correct is true) as correct_attempts,
        count(*) filter (where is_correct is false) as wrong_attempts,
        max(created_at) as last_attempt_at
    from {{ source('lemma', 'student_attempts') }}
    group by student_id
),
help_agg as (
    select
        student_id,
        count(*) as help_request_count,
        max(created_at) as last_help_at
    from {{ source('lemma', 'student_help_events') }}
    group by student_id
),
prediction_ranked as (
    select
        student_id,
        predicted_mastery_score,
        risk_level,
        predicted_at,
        row_number() over (
            partition by student_id
            order by predicted_at desc, prediction_id desc
        ) as row_num
    from {{ source('lemma', 'student_skill_predictions') }}
),
latest_prediction as (
    select
        student_id,
        risk_level as latest_risk_level,
        predicted_mastery_score as latest_mastery_score,
        predicted_at as latest_prediction_at
    from prediction_ranked
    where row_num = 1
),
recommendation_agg as (
    select
        student_id,
        count(*) filter (where is_completed is false) as active_recommendation_count,
        ((array_agg(
            recommendation_text
            order by created_at desc, recommendation_id desc
        ) filter (where is_completed is false)))[1] as latest_recommendation_text
    from {{ source('lemma', 'learning_recommendations') }}
    group by student_id
)
select
    sp.student_id,
    cs.section_name,
    cs.grade_level,
    sp.learning_status,
    coalesce(sp.current_streak, 0) as current_streak,
    coalesce(sp.total_star_points, 0::double precision) as total_star_points,
    coalesce(sa.total_sessions, 0) as total_sessions,
    coalesce(sa.completed_sessions, 0) as completed_sessions,
    sa.last_session_at,
    coalesce(aa.total_answer_attempts, 0) as total_answer_attempts,
    coalesce(aa.correct_attempts, 0) as correct_attempts,
    coalesce(aa.wrong_attempts, 0) as wrong_attempts,
    aa.last_attempt_at,
    case when coalesce(aa.total_answer_attempts, 0) = 0 then null
        else round(coalesce(aa.correct_attempts, 0)::numeric / aa.total_answer_attempts::numeric, 4)
    end as overall_accuracy_rate,
    coalesce(ha.help_request_count, 0) as help_request_count,
    ha.last_help_at,
    case when coalesce(aa.total_answer_attempts, 0) + coalesce(ha.help_request_count, 0) = 0 then null
        else round(coalesce(ha.help_request_count, 0)::numeric / (coalesce(aa.total_answer_attempts, 0) + coalesce(ha.help_request_count, 0))::numeric, 4)
    end as help_request_rate,
    lp.latest_risk_level,
    lp.latest_mastery_score,
    lp.latest_prediction_at,
    coalesce(ra.active_recommendation_count, 0) as active_recommendation_count,
    ra.latest_recommendation_text,
    greatest(sa.last_session_at, aa.last_attempt_at, ha.last_help_at, lp.latest_prediction_at) as last_activity_at
from {{ source('lemma', 'student_profiles') }} as sp
left join {{ source('lemma', 'class_sections') }} as cs on cs.section_id = sp.section_id
left join session_agg as sa on sa.student_id = sp.student_id
left join attempt_agg as aa on aa.student_id = sp.student_id
left join help_agg as ha on ha.student_id = sp.student_id
left join latest_prediction as lp on lp.student_id = sp.student_id
left join recommendation_agg as ra on ra.student_id = sp.student_id
