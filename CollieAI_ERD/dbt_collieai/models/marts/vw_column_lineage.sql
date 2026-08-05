{{ config(materialized='view') }}

-- This model is intentionally a documentation table.  It makes column-level
-- lineage queryable in tools whose graph only renders table-to-table edges.
-- depends_on: {{ source('lemma', 'ai_sessions') }}
-- depends_on: {{ source('lemma', 'attempt_steps') }}
-- depends_on: {{ source('lemma', 'class_sections') }}
-- depends_on: {{ source('lemma', 'dda_events') }}
-- depends_on: {{ source('lemma', 'math_problems') }}
-- depends_on: {{ source('lemma', 'math_skills') }}
-- depends_on: {{ source('lemma', 'math_topics') }}
-- depends_on: {{ source('lemma', 'show_me_breakdowns') }}
-- depends_on: {{ source('lemma', 'student_attempts') }}
-- depends_on: {{ source('lemma', 'student_help_events') }}
-- depends_on: {{ source('lemma', 'student_profiles') }}
-- depends_on: {{ source('lemma', 'student_skill_predictions') }}

WITH column_lineage AS (
    SELECT * FROM (
        VALUES
            -- mv_daily_student_performance
            ('mv_daily_student_performance', 'performance_date', 'student_attempts', 'created_at', 'CAST(created_at AS date)', 'derived'),
            ('mv_daily_student_performance', 'student_id', 'student_attempts', 'student_id', 'activity key', 'direct'),
            ('mv_daily_student_performance', 'section_name', 'class_sections', 'section_name', 'lookup through student_profiles.section_id', 'direct'),
            ('mv_daily_student_performance', 'grade_level', 'class_sections', 'grade_level', 'lookup through student_profiles.section_id', 'direct'),
            ('mv_daily_student_performance', 'sessions_started', 'ai_sessions', 'session_id', 'COUNT(*) by student and date', 'derived'),
            ('mv_daily_student_performance', 'sessions_completed', 'ai_sessions', 'session_status', 'COUNT(*) FILTER (session_status = completed)', 'derived'),
            ('mv_daily_student_performance', 'total_answer_attempts', 'student_attempts', 'attempt_id', 'COUNT(*) by student and date', 'derived'),
            ('mv_daily_student_performance', 'correct_attempts', 'student_attempts', 'is_correct', 'COUNT(*) FILTER (is_correct)', 'derived'),
            ('mv_daily_student_performance', 'wrong_attempts', 'student_attempts', 'is_correct', 'COUNT(*) FILTER (not is_correct)', 'derived'),
            ('mv_daily_student_performance', 'avg_score', 'student_attempts', 'score', 'AVG(score)', 'derived'),
            ('mv_daily_student_performance', 'avg_time_spent_seconds', 'student_attempts', 'time_spent_seconds', 'AVG(time_spent_seconds)', 'derived'),
            ('mv_daily_student_performance', 'hinted_attempt_count', 'attempt_steps', 'hint_used', 'COUNT attempts with BOOL_OR(hint_used > 0)', 'derived'),
            ('mv_daily_student_performance', 'help_request_count', 'student_help_events', 'help_event_id', 'COUNT(*) by student and date', 'derived'),
            ('mv_daily_student_performance', 'dda_trigger_count', 'dda_events', 'dda_event_id', 'COUNT(*) by student and date', 'derived'),
            ('mv_daily_student_performance', 'show_me_count', 'show_me_breakdowns', 'breakdown_id', 'COUNT(*) joined to ai_sessions', 'derived'),
            ('mv_daily_student_performance', 'accuracy_rate', 'student_attempts', 'is_correct', 'correct_attempts / total_answer_attempts', 'derived'),

            -- mv_weekly_skill_mastery
            ('mv_weekly_skill_mastery', 'week_start_date', 'student_attempts', 'created_at', 'DATE_TRUNC(week, created_at)', 'derived'),
            ('mv_weekly_skill_mastery', 'student_id', 'student_attempts', 'student_id', 'activity key', 'direct'),
            ('mv_weekly_skill_mastery', 'skill_id', 'math_problems', 'skill_id', 'lookup from student_attempts.problem_id', 'direct'),
            ('mv_weekly_skill_mastery', 'skill_name', 'math_skills', 'skill_name', 'lookup by skill_id', 'direct'),
            ('mv_weekly_skill_mastery', 'topic_name', 'math_topics', 'topic_name', 'lookup through math_skills.topic_id', 'direct'),
            ('mv_weekly_skill_mastery', 'total_answer_attempts', 'student_attempts', 'attempt_id', 'COUNT(*) by week, student, skill', 'derived'),
            ('mv_weekly_skill_mastery', 'correct_attempts', 'student_attempts', 'is_correct', 'COUNT(*) FILTER (is_correct)', 'derived'),
            ('mv_weekly_skill_mastery', 'wrong_attempts', 'student_attempts', 'is_correct', 'COUNT(*) FILTER (not is_correct)', 'derived'),
            ('mv_weekly_skill_mastery', 'avg_score', 'student_attempts', 'score', 'AVG(score)', 'derived'),
            ('mv_weekly_skill_mastery', 'avg_time_spent_seconds', 'student_attempts', 'time_spent_seconds', 'AVG(time_spent_seconds)', 'derived'),
            ('mv_weekly_skill_mastery', 'hinted_attempt_count', 'attempt_steps', 'hint_used', 'COUNT attempts with BOOL_OR(hint_used > 0)', 'derived'),
            ('mv_weekly_skill_mastery', 'hint_usage_rate', 'attempt_steps', 'hint_used', 'hinted_attempt_count / total_answer_attempts', 'derived'),
            ('mv_weekly_skill_mastery', 'help_request_count', 'student_help_events', 'help_event_id', 'COUNT(*) by week, student, skill', 'derived'),
            ('mv_weekly_skill_mastery', 'help_request_rate', 'student_help_events', 'help_event_id', 'help_request_count / (attempts + help requests)', 'derived'),
            ('mv_weekly_skill_mastery', 'dda_trigger_count', 'dda_events', 'dda_event_id', 'COUNT(*) by week, student, skill', 'derived'),
            ('mv_weekly_skill_mastery', 'show_me_count', 'show_me_breakdowns', 'breakdown_id', 'COUNT(*) joined to ai_sessions', 'derived'),
            ('mv_weekly_skill_mastery', 'accuracy_rate', 'student_attempts', 'is_correct', 'correct_attempts / total_answer_attempts', 'derived'),
            ('mv_weekly_skill_mastery', 'latest_predicted_mastery_score', 'student_skill_predictions', 'predicted_mastery_score', 'latest prediction in the week', 'derived'),
            ('mv_weekly_skill_mastery', 'latest_risk_level', 'student_skill_predictions', 'risk_level', 'latest prediction in the week', 'derived'),
            ('mv_weekly_skill_mastery', 'recommended_action', 'student_skill_predictions', 'recommended_action', 'latest prediction in the week', 'derived'),
            ('mv_weekly_skill_mastery', 'latest_prediction_at', 'student_skill_predictions', 'predicted_at', 'latest prediction timestamp in the week', 'derived'),

            -- mv_topic_failure_patterns
            ('mv_topic_failure_patterns', 'topic_name', 'math_topics', 'topic_name', 'lookup through math_skills.topic_id', 'direct'),
            ('mv_topic_failure_patterns', 'grade_level', 'math_topics', 'grade_level', 'lookup through math_skills.topic_id', 'direct'),
            ('mv_topic_failure_patterns', 'skill_id', 'math_skills', 'skill_id', 'activity key', 'direct'),
            ('mv_topic_failure_patterns', 'skill_name', 'math_skills', 'skill_name', 'lookup by skill_id', 'direct'),
            ('mv_topic_failure_patterns', 'total_answer_attempts', 'student_attempts', 'attempt_id', 'COUNT(*) by skill', 'derived'),
            ('mv_topic_failure_patterns', 'correct_attempts', 'student_attempts', 'is_correct', 'COUNT(*) FILTER (is_correct)', 'derived'),
            ('mv_topic_failure_patterns', 'wrong_attempts', 'student_attempts', 'is_correct', 'COUNT(*) FILTER (not is_correct)', 'derived'),
            ('mv_topic_failure_patterns', 'failure_rate', 'student_attempts', 'is_correct', 'wrong_attempts / total_answer_attempts', 'derived'),
            ('mv_topic_failure_patterns', 'avg_time_spent_seconds', 'student_attempts', 'time_spent_seconds', 'AVG(time_spent_seconds)', 'derived'),
            ('mv_topic_failure_patterns', 'affected_student_count', 'student_attempts', 'student_id', 'COUNT(DISTINCT student_id)', 'derived'),
            ('mv_topic_failure_patterns', 'latest_failure_at', 'student_attempts', 'created_at', 'MAX(created_at) FILTER (not is_correct)', 'derived'),
            ('mv_topic_failure_patterns', 'wrong_step_count', 'attempt_steps', 'is_step_correct', 'COUNT(*) FILTER (not is_step_correct)', 'derived'),
            ('mv_topic_failure_patterns', 'hinted_step_count', 'attempt_steps', 'hint_used', 'COUNT(*) FILTER (hint_used > 0)', 'derived'),
            ('mv_topic_failure_patterns', 'help_request_count', 'student_help_events', 'help_event_id', 'COUNT(*) by skill', 'derived'),
            ('mv_topic_failure_patterns', 'dda_trigger_count', 'dda_events', 'dda_event_id', 'COUNT(*) by skill', 'derived'),
            ('mv_topic_failure_patterns', 'show_me_count', 'show_me_breakdowns', 'breakdown_id', 'COUNT(*) by skill', 'derived')
    ) AS mapping (mv_name, mv_column, source_table, source_column, transformation, lineage_type)
)

SELECT
    mv_name,
    mv_column,
    source_table,
    source_column,
    transformation,
    lineage_type
FROM column_lineage
ORDER BY mv_name, mv_column, source_table, source_column
