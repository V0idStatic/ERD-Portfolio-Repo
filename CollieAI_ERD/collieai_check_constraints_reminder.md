# CollieAI SQL CHECK Constraints Reminder

Use this later after your raw `CREATE TABLE` statements are done.

Your clean build order:

```text
1. CREATE TABLES
2. ALTER TABLE ADD FOREIGN KEYS
3. ALTER TABLE ADD CHECK CONSTRAINTS
4. CREATE INDEXES
5. CREATE VIEWS / MATERIALIZED VIEWS
6. INSERT SEED DATA
```

## Rule to remember

Use `CHECK` when a column should only accept a safe range or fixed list of values.

Examples:

```sql
CHECK (score >= 0)
CHECK (accuracy_rate BETWEEN 0 AND 1)
CHECK (status IN ('started', 'success', 'failed'))
```

For nullable columns, use this pattern:

```sql
CHECK (column_name IS NULL OR column_name BETWEEN 0 AND 1)
```

That means the column can be empty, but if it has a value, it must be valid.

---

# 1. Student Profiles

## `student_profiles.learning_status`

```sql
ALTER TABLE student_profiles
ADD CONSTRAINT chk_student_profiles_learning_status
CHECK (
    learning_status IN (
        'not_assessed',
        'on_track',
        'needs_support',
        'struggling',
        'improving',
        'inactive'
    )
);
```

Use this because learning status should not accept random values like `'good'`, `'bad'`, `'okay'`, etc.

---

# 2. Student Attempts

## `student_attempts.score`

```sql
ALTER TABLE student_attempts
ADD CONSTRAINT chk_student_attempts_score
CHECK (score IS NULL OR score >= 0);
```

## `student_attempts.time_spent_seconds`

```sql
ALTER TABLE student_attempts
ADD CONSTRAINT chk_student_attempts_time_spent
CHECK (time_spent_seconds IS NULL OR time_spent_seconds >= 0);
```

## `student_attempts.attempt_number`

```sql
ALTER TABLE student_attempts
ADD CONSTRAINT chk_student_attempts_attempt_number
CHECK (attempt_number > 0);
```

---

# 3. Attempt Steps

## `attempt_steps.step_number`

```sql
ALTER TABLE attempt_steps
ADD CONSTRAINT chk_attempt_steps_step_number
CHECK (step_number > 0);
```

## `attempt_steps.hints_used_count`

```sql
ALTER TABLE attempt_steps
ADD CONSTRAINT chk_attempt_steps_hints_used_count
CHECK (hints_used_count >= 0);
```

---

# 4. DDA Events

## `dda_events.trigger_reason`

```sql
ALTER TABLE dda_events
ADD CONSTRAINT chk_dda_events_trigger_reason
CHECK (
    trigger_reason IN (
        'repeated_wrong_answers',
        'fast_correct_answers',
        'hint_overuse',
        'timeout',
        'low_confidence',
        'manual_adjustment'
    )
);
```

Use this so your dynamic difficulty adjustment events stay analyzable.

---

# 5. Student Help Events

## `student_help_events.help_type`

```sql
ALTER TABLE student_help_events
ADD CONSTRAINT chk_student_help_events_help_type
CHECK (
    help_type IN (
        'hint_requested',
        'show_me_clicked',
        'ai_prompted_help',
        'step_breakdown_requested',
        'definition_requested',
        'example_requested'
    )
);
```

---

# 6. Guardrail Checks

## `guardrail_checks.confidence_score`

```sql
ALTER TABLE guardrail_checks
ADD CONSTRAINT chk_guardrail_checks_confidence_score
CHECK (confidence_score IS NULL OR confidence_score BETWEEN 0 AND 1);
```

Use this because confidence scores should usually be stored as a 0 to 1 value.

---

# 7. Prompt Usage Logs

## `prompt_usage_logs.temperature`

```sql
ALTER TABLE prompt_usage_logs
ADD CONSTRAINT chk_prompt_usage_logs_temperature
CHECK (temperature IS NULL OR temperature BETWEEN 0 AND 2);
```

## `prompt_usage_logs.input_token_count` and `output_token_count`

```sql
ALTER TABLE prompt_usage_logs
ADD CONSTRAINT chk_prompt_usage_logs_token_counts
CHECK (
    input_token_count >= 0
    AND output_token_count >= 0
);
```

---

# 8. Student Skill Features

## Count columns should never be negative

```sql
ALTER TABLE student_skill_features
ADD CONSTRAINT chk_student_skill_features_counts
CHECK (
    total_attempts >= 0
    AND correct_attempts >= 0
    AND help_request_count >= 0
    AND failed_loop_count >= 0
    AND dda_trigger_count >= 0
    AND show_me_count >= 0
);
```

## Rate columns should be between 0 and 1

```sql
ALTER TABLE student_skill_features
ADD CONSTRAINT chk_student_skill_features_rates
CHECK (
    (accuracy_rate IS NULL OR accuracy_rate BETWEEN 0 AND 1)
    AND (hint_usage_rate IS NULL OR hint_usage_rate BETWEEN 0 AND 1)
    AND (help_request_rate IS NULL OR help_request_rate BETWEEN 0 AND 1)
);
```

---

# 9. Student Skill Predictions

## `student_skill_predictions.predicted_mastery_score`

```sql
ALTER TABLE student_skill_predictions
ADD CONSTRAINT chk_student_skill_predictions_mastery_score
CHECK (
    predicted_mastery_score IS NULL
    OR predicted_mastery_score BETWEEN 0 AND 1
);
```

## `student_skill_predictions.risk_level`

```sql
ALTER TABLE student_skill_predictions
ADD CONSTRAINT chk_student_skill_predictions_risk_level
CHECK (
    risk_level IS NULL
    OR risk_level IN ('low', 'medium', 'high')
);
```

---

# 10. ML Models

## ML metric scores should be between 0 and 1

```sql
ALTER TABLE ml_models
ADD CONSTRAINT chk_ml_models_scores
CHECK (
    (accuracy_score IS NULL OR accuracy_score BETWEEN 0 AND 1)
    AND (precision_score IS NULL OR precision_score BETWEEN 0 AND 1)
    AND (recall_score IS NULL OR recall_score BETWEEN 0 AND 1)
    AND (f1_score IS NULL OR f1_score BETWEEN 0 AND 1)
);
```

---

# 11. Learning Recommendations

## `learning_recommendations.target_user_type`

```sql
ALTER TABLE learning_recommendations
ADD CONSTRAINT chk_learning_recommendations_target_user_type
CHECK (
    target_user_type IN (
        'student',
        'parent',
        'teacher'
    )
);
```

## `learning_recommendations.priority_level`

```sql
ALTER TABLE learning_recommendations
ADD CONSTRAINT chk_learning_recommendations_priority_level
CHECK (priority_level BETWEEN 1 AND 5);
```

Recommended meaning:

```text
1 = lowest priority
3 = normal priority
5 = highest priority
```

## `learning_recommendations.recommendation_type`

```sql
ALTER TABLE learning_recommendations
ADD CONSTRAINT chk_learning_recommendations_recommendation_type
CHECK (
    recommendation_type IN (
        'practice_skill',
        'review_concept',
        'increase_difficulty',
        'decrease_difficulty',
        'take_break',
        'ask_teacher_support',
        'parent_follow_up',
        'show_visual_example'
    )
);
```

---

# 12. Rewards and Gamification

## `reward_transactions.points_earned`

```sql
ALTER TABLE reward_transactions
ADD CONSTRAINT chk_reward_transactions_points_earned
CHECK (points_earned >= 0);
```

## `avatar_items.cost_points`

```sql
ALTER TABLE avatar_items
ADD CONSTRAINT chk_avatar_items_cost_points
CHECK (cost_points >= 0);
```

## `avatars.avatar_type`

```sql
ALTER TABLE avatars
ADD CONSTRAINT chk_avatars_avatar_type
CHECK (
    avatar_type IN (
        'default',
        'premium',
        'event',
        'achievement'
    )
);
```

## `avatar_items.item_type`

```sql
ALTER TABLE avatar_items
ADD CONSTRAINT chk_avatar_items_item_type
CHECK (
    item_type IN (
        'hat',
        'collar',
        'glasses',
        'outfit',
        'background',
        'accessory'
    )
);
```

---

# 13. N8N Workflow Logs

## `n8n_workflow_logs.status`

```sql
ALTER TABLE n8n_workflow_logs
ADD CONSTRAINT chk_n8n_workflow_logs_status
CHECK (
    status IN (
        'started',
        'success',
        'failed',
        'cancelled',
        'running'
    )
);
```

---

# 14. API Request Logs

## `api_request_logs.request_method`

```sql
ALTER TABLE api_request_logs
ADD CONSTRAINT chk_api_request_logs_request_method
CHECK (
    request_method IN (
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE'
    )
);
```

## `api_request_logs.status_code`

```sql
ALTER TABLE api_request_logs
ADD CONSTRAINT chk_api_request_logs_status_code
CHECK (
    status_code IS NULL
    OR status_code BETWEEN 100 AND 599
);
```

## `api_request_logs.latency_ms`

```sql
ALTER TABLE api_request_logs
ADD CONSTRAINT chk_api_request_logs_latency_ms
CHECK (
    latency_ms IS NULL
    OR latency_ms >= 0
);
```

---

# 15. Notifications

## `notifications.notification_type`

```sql
ALTER TABLE notifications
ADD CONSTRAINT chk_notifications_notification_type
CHECK (
    notification_type IN (
        'student_progress',
        'learning_warning',
        'achievement',
        'teacher_alert',
        'parent_update',
        'system_notice'
    )
);
```

---

# 16. Optional Future CHECK Constraints

These were not final yet, but you may consider them later.

## `system_prompts.prompt_type`

```sql
ALTER TABLE system_prompts
ADD CONSTRAINT chk_system_prompts_prompt_type
CHECK (
    prompt_type IN (
        'math_tutor',
        'guardrail',
        'hint_generation',
        'feedback_generation',
        'difficulty_adjustment',
        'parent_summary',
        'teacher_summary'
    )
);
```

## `math_problems.source_type`

```sql
ALTER TABLE math_problems
ADD CONSTRAINT chk_math_problems_source_type
CHECK (
    source_type IN (
        'manual',
        'ai_generated',
        'teacher_created',
        'imported'
    )
);
```

## `vector_records.source_type`

```sql
ALTER TABLE vector_records
ADD CONSTRAINT chk_vector_records_source_type
CHECK (
    source_type IN (
        'session_message',
        'math_problem',
        'skill',
        'student_summary',
        'learning_recommendation'
    )
);
```

---

# Quick Naming Pattern

Use this naming style:

```text
chk_<table_name>_<column_or_purpose>
```

Examples:

```sql
chk_student_profiles_learning_status
chk_prompt_usage_logs_token_counts
chk_ml_models_scores
chk_api_request_logs_status_code
```

---

# Quick Design Rule

Use CHECK constraints for:

```text
status values
risk levels
user types
recommendation types
non-negative counts
0-to-1 rates/scores
valid HTTP methods
valid priority ranges
valid timestamps/durations when applicable
```

Do not overdo CHECK constraints for fields that may change often unless you are okay updating the database constraint later.

Example: if `help_type` will change often during experimentation, keep it as `TEXT` first, then add the CHECK once your categories are stable.
