# CollieAI Data Dictionary

Tables are arranged alphabetically. Fields within each table follow their order in `collieAI.sql`.

## `ai_messages`

**Purpose:** Stores and manages ai messages.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `message_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `ai_messages` | `1` |
| `session_id` | INT | Whole number | 4 bytes | Foreign key → `ai_sessions.session_id` | No | Links this record to `ai_sessions.session_id` | `1` |
| `sender` | INT | Whole number | 4 bytes | — | No | Stores the sender value | `1` |
| `message_text` | VARCHAR(255) | Text | 255 characters | — | No | Text content for message | `Sample text` |
| `message_type` | VARCHAR(255) | Text | 255 characters | — | No | Classification used for message | `Sample value` |
| `token_count` | INT | Whole number | 4 bytes | — | No | Number of token | `1` |
| `created_At` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Stores the created At value | `2026-09-07 10:30:00+08` |

## `ai_sessions`

**Purpose:** Stores and manages ai sessions.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `session_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `ai_sessions` | `1` |
| `student_id` | INT | Whole number | 4 bytes | Foreign key → `student_profiles.student_id` | No | Links this record to `student_profiles.student_id` | `1` |
| `problem_id` | INT | Whole number | 4 bytes | Foreign key → `math_problems.problem_id` | No | Links this record to `math_problems.problem_id` | `1` |
| `session_status` | VARCHAR(255) | Text | 255 characters | — | No | Current session status | `active` |
| `started_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time associated with started | `2026-09-07 10:30:00+08` |
| `ended_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time associated with ended | `2026-09-07 10:30:00+08` |
| `created_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was created | `2026-09-07 10:30:00+08` |

## `api_request_logs`

**Purpose:** Stores and manages api request logs.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `api_log_id` | BIGINT | Whole number | 8 bytes | Primary key; Identity | Yes | Unique identifier for a record in `api_request_logs` | `1` |
| `user_id` | INT | Whole number | 4 bytes | Foreign key → `users.user_id` | No | Links this record to `users.user_id` | `1` |
| `session_id` | INT | Whole number | 4 bytes | Foreign key → `ai_sessions.session_id` | No | Links this record to `ai_sessions.session_id` | `1` |
| `service_name` | TEXT | Free-form text | Variable | — | Yes | Name of the service | `Sample name` |
| `endpoint` | TEXT | Free-form text | Variable | — | Yes | Stores the endpoint value | `Sample value` |
| `request_method` | TEXT | Free-form text | Variable | — | Yes | Stores the request method value | `Sample value` |
| `status_code` | INT | Whole number | 4 bytes | — | No | Stores the status code value | `1` |
| `latency_ms` | INT | Whole number | 4 bytes | — | No | Stores the latency ms value | `1` |
| `error_message` | TEXT | Free-form text | Variable | — | No | Stores the error message value | `Sample value` |
| `created_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was created | `2026-09-07 10:30:00+08` |

## `attempt_steps`

**Purpose:** Stores and manages attempt steps.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `step_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `attempt_steps` | `1` |
| `attempt_id` | INT | Whole number | 4 bytes | Foreign key → `student_attempts.attempt_id` | No | Links this record to `student_attempts.attempt_id` | `1` |
| `step_number` | SMALLINT | Whole number | 2 bytes | — | Yes | Stores the step number value | `1` |
| `student_step_answer` | TEXT | Free-form text | Variable | — | No | Stores the student step answer value | `Sample value` |
| `ai_feedback` | TEXT | Free-form text | Variable | — | No | Stores the ai feedback value | `Sample value` |
| `is_step_correct` | BOOLEAN | TRUE or FALSE | 1 byte | — | No | Indicates whether step correct | `TRUE` |
| `hint_used` | SMALLINT | Whole number | 2 bytes | Default: `0` | Yes | Stores the hint used value | `1` |
| `created_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was created | `2026-09-07 10:30:00+08` |

## `avatar_items`

**Purpose:** Stores and manages avatar items.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `item_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `avatar_items` | `1` |
| `item_name` | TEXT | Free-form text | Variable | — | Yes | Name of the item | `Sample name` |
| `item_type` | TEXT | Free-form text | Variable | — | Yes | Classification used for item | `Sample value` |
| `cost_points` | INT | Whole number | 4 bytes | Default: `0` | Yes | Stores the cost points value | `1` |
| `asset_file_id` | INT | Whole number | 4 bytes | Foreign key → `file_assets.file_id` | No | Links this record to `file_assets.file_id` | `1` |
| `is_active` | BOOLEAN | TRUE or FALSE | 1 byte | Default: `TRUE` | Yes | Indicates whether the record is active | `TRUE` |
| `created_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was created | `2026-09-07 10:30:00+08` |

## `avatars`

**Purpose:** Stores and manages avatars.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `avatar_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `avatars` | `1` |
| `avatar_name` | TEXT | Free-form text | Variable | — | Yes | Name of the avatar | `Sample name` |
| `avatar_type` | TEXT | Free-form text | Variable | — | Yes | Classification used for avatar | `Sample value` |
| `default_asset_file_id` | INT | Whole number | 4 bytes | Foreign key → `file_assets.file_id` | No | Links this record to `file_assets.file_id` | `1` |
| `is_default` | BOOLEAN | TRUE or FALSE | 1 byte | Default: `FALSE` | Yes | Indicates whether default | `TRUE` |
| `created_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was created | `2026-09-07 10:30:00+08` |

## `billing_accounts`

**Purpose:** Stores and manages billing accounts.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `billing_account_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `billing_accounts` | `1` |
| `user_id` | INT | Whole number | 4 bytes | Foreign key → `users.user_id` | No | Links this record to `users.user_id` | `1` |
| `organization_id` | INT | Whole number | 4 bytes | Foreign key → `organizations.organization_id` | No | Links this record to `organizations.organization_id` | `1` |
| `billing_email` | TEXT | Free-form text | Variable | — | Yes | Stores the billing email value | `user@example.com` |
| `provider_customer_reference` | TEXT | Free-form text | Variable | Unique | No | Stores the provider customer reference value | `Sample value` |
| `created_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was created | `2026-09-07 10:30:00+08` |
| `updated_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was last updated | `2026-09-07 10:30:00+08` |

## `class_sections`

**Purpose:** Stores and manages class sections.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `section_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `class_sections` | `1` |
| `section_name` | VARCHAR(55) | Text | 55 characters | — | Yes | Name of the section | `Sample name` |
| `grade_level` | SMALLINT | Whole number | 2 bytes | — | Yes | Stores the grade level value | `5` |
| `school_YEAR` | INT | Whole number | 4 bytes | — | Yes | Stores the school YEAR value | `1` |
| `teacher_id` | INT | Whole number | 4 bytes | Foreign key → `organization_members.teacher_id` | Yes | Links this record to `organization_members.teacher_id` | `1` |
| `created_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was created | `2026-09-07 10:30:00+08` |
| `organization_id` | INT | Whole number | 4 bytes | Foreign key → `organization_members.organization_id` | No | Links this record to `organization_members.organization_id` | `1` |

## `dda_events`

**Purpose:** Stores and manages dda events.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `dda_event_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `dda_events` | `1` |
| `session_id` | INT | Whole number | 4 bytes | Foreign key → `ai_sessions.session_id` | No | Links this record to `ai_sessions.session_id` | `1` |
| `student_id` | INT | Whole number | 4 bytes | — | No | Identifies the associated student | `1` |
| `skill_id` | INT | Whole number | 4 bytes | Foreign key → `math_skills.skill_id` | No | Links this record to `math_skills.skill_id` | `1` |
| `trigger_reason` | TEXT | Free-form text | Variable | — | Yes | Stores the trigger reason value | `Sample value` |
| `previous_difficulty_id` | INT | Whole number | 4 bytes | — | No | Stores the previous difficulty id value | `1` |
| `new_difficulty_id` | INT | Whole number | 4 bytes | Foreign key → `difficulty_levels.difficulty_id` | Yes | Links this record to `difficulty_levels.difficulty_id` | `1` |
| `visual_analogy_used` | TEXT | Free-form text | Variable | — | No | Stores the visual analogy used value | `Sample value` |
| `created_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was created | `2026-09-07 10:30:00+08` |

## `difficulty_levels`

**Purpose:** Stores and manages difficulty levels.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `difficulty_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `difficulty_levels` | `1` |
| `difficulty_name` | VARCHAR(255) | Text | 255 characters | — | No | Name of the difficulty | `Sample name` |
| `numerical_value` | NUMERIC(5,2) | Decimal (5,2) | Variable precision | — | No | Stores the numerical value value | `95.00` |
| `description` | TEXT | Free-form text | Variable | — | No | Provides additional details about the record | `Sample text` |
| `created_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was created | `2026-09-07 10:30:00+08` |

## `file_assets`

**Purpose:** Stores and manages file assets.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `file_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `file_assets` | `1` |
| `owner_user_id` | INT | Whole number | 4 bytes | Foreign key → `users.user_id` | No | Links this record to `users.user_id` | `1` |
| `file_type` | TEXT | Free-form text | Variable | — | No | Classification used for file | `Sample value` |
| `file_url` | TEXT | Free-form text | Variable | — | No | Stores the file url value | `https://example.com/file.png` |
| `mime_type` | TEXT | Free-form text | Variable | — | No | Classification used for mime | `Sample value` |
| `file_size_bytes` | BIGINT | Whole number | 8 bytes | — | No | Stores the file size bytes value | `1` |
| `storage_provider` | TEXT | Free-form text | Variable | — | No | Stores the storage provider value | `Sample value` |
| `checksum` | BOOLEAN | TRUE or FALSE | 1 byte | — | No | Stores the checksum value | `TRUE` |
| `created_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was created | `2026-09-07 10:30:00+08` |

## `guardrail_checks`

**Purpose:** Stores and manages guardrail checks.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `guardrail_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `guardrail_checks` | `1` |
| `message_id` | INT | Whole number | 4 bytes | Foreign key → `ai_messages.message_id` | No | Links this record to `ai_messages.message_id` | `1` |
| `is_math_related` | BOOLEAN | TRUE or FALSE | 1 byte | — | No | Indicates whether math related | `TRUE` |
| `prompt_injection_detected` | BOOLEAN | TRUE or FALSE | 1 byte | Default: `FALSE` | Yes | Stores the prompt injection detected value | `TRUE` |
| `violation_type` | TEXT | Free-form text | Variable | — | No | Classification used for violation | `Sample value` |
| `action_taken` | TEXT | Free-form text | Variable | — | No | Stores the action taken value | `Sample value` |
| `confidence_score` | NUMERIC(5,4) | Decimal (5,4) | Variable precision | — | No | Stores the confidence score value | `95.00` |
| `created_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was created | `2026-09-07 10:30:00+08` |

## `learning_recommendations`

**Purpose:** Stores and manages learning recommendations.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `recommendation_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `learning_recommendations` | `1` |
| `student_id` | INT | Whole number | 4 bytes | — | Yes | Identifies the associated student | `1` |
| `skill_id` | INT | Whole number | 4 bytes | — | Yes | Identifies the associated mathematics skill | `1` |
| `prediction_id` | INT | Whole number | 4 bytes | Foreign key → `student_skill_predictions.prediction_id` | No | Links this record to `student_skill_predictions.prediction_id` | `1` |
| `recommendation_text` | TEXT | Free-form text | Variable | — | Yes | Text content for recommendation | `Sample text` |
| `target_user_type` | TEXT | Free-form text | Variable | — | Yes | Classification used for target user | `Sample value` |
| `priority_level` | SMALLINT | Whole number | 2 bytes | Default: `3` | Yes | Stores the priority level value | `1` |
| `is_completed` | BOOLEAN | TRUE or FALSE | 1 byte | Default: `FALSE` | Yes | Indicates whether completed | `TRUE` |
| `created_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was created | `2026-09-07 10:30:00+08` |
| `completed_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | — | No | Date and time associated with completed | `2026-09-07 10:30:00+08` |

## `math_problems`

**Purpose:** Stores and manages math problems.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `problem_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `math_problems` | `1` |
| `skill_id` | INT | Whole number | 4 bytes | Foreign key → `math_skills.skill_id` | No | Links this record to `math_skills.skill_id` | `1` |
| `difficulty_id` | INT | Whole number | 4 bytes | Foreign key → `difficulty_levels.difficulty_id` | No | Links this record to `difficulty_levels.difficulty_id` | `1` |
| `problem_text` | TEXT | Free-form text | Variable | — | No | Text content for problem | `Sample text` |
| `correct_answer` | DOUBLE PRECISION | Decimal number | 8 bytes | — | No | Stores the correct answer value | `95.00` |
| `solution_pattern` | TEXT | Free-form text | Variable | — | Yes | Stores the solution pattern value | `Sample value` |

## `math_skills`

**Purpose:** Stores and manages math skills.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `skill_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `math_skills` | `1` |
| `topic_id` | INT | Whole number | 4 bytes | Foreign key → `math_topics.topic_id` | No | Links this record to `math_topics.topic_id` | `1` |
| `skill_name` | VARCHAR(255) | Text | 255 characters | — | No | Name of the skill | `Sample name` |
| `skill_description` | TEXT | Free-form text | Variable | — | No | Stores the skill description value | `Sample text` |
| `grade_level` | SMALLINT | Whole number | 2 bytes | — | No | Stores the grade level value | `5` |
| `display_order` | INT | Whole number | 4 bytes | — | No | Stores the display order value | `1` |
| `is_active` | BOOLEAN | TRUE or FALSE | 1 byte | — | No | Indicates whether the record is active | `TRUE` |
| `created_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was created | `2026-09-07 10:30:00+08` |
| `updated_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was last updated | `2026-09-07 10:30:00+08` |

## `math_topics`

**Purpose:** Stores and manages math topics.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `topic_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `math_topics` | `1` |
| `topic_name` | VARCHAR(255) | Text | 255 characters | — | No | Name of the topic | `Sample name` |
| `description` | TEXT | Free-form text | Variable | — | No | Provides additional details about the record | `Sample text` |
| `grade_level` | SMALLINT | Whole number | 2 bytes | — | No | Stores the grade level value | `5` |
| `display_order` | INT | Whole number | 4 bytes | — | No | Stores the display order value | `1` |
| `is_active` | BOOLEAN | TRUE or FALSE | 1 byte | — | No | Indicates whether the record is active | `TRUE` |
| `created_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was created | `2026-09-07 10:30:00+08` |
| `updated_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was last updated | `2026-09-07 10:30:00+08` |

## `ml_models`

**Purpose:** Stores and manages ml models.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `model_version_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `ml_models` | `1` |
| `model_name` | TEXT | Free-form text | Variable | — | Yes | Name of the model | `Sample name` |
| `algorithm` | TEXT | Free-form text | Variable | — | Yes | Stores the algorithm value | `Sample value` |
| `training_date` | DATE | YYYY-MM-DD | 4 bytes | — | No | Date associated with training | `2026-09-07` |
| `accuracy_score` | NUMERIC(5,4) | Decimal (5,4) | Variable precision | — | No | Stores the accuracy score value | `95.00` |
| `precision_score` | NUMERIC(5,4) | Decimal (5,4) | Variable precision | — | No | Stores the precision score value | `95.00` |
| `recall_score` | NUMERIC(5,4) | Decimal (5,4) | Variable precision | — | No | Stores the recall score value | `95.00` |
| `f1_score` | NUMERIC(5,4) | Decimal (5,4) | Variable precision | — | No | Stores the f1 score value | `95.00` |
| `notes` | TEXT | Free-form text | Variable | — | No | Stores the notes value | `Sample value` |
| `created_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was created | `2026-09-07 10:30:00+08` |

## `n8n_workflow_logs`

**Purpose:** Stores and manages n8n workflow logs.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `workflow_log_id` | BIGINT | Whole number | 8 bytes | Primary key; Identity | Yes | Unique identifier for a record in `n8n_workflow_logs` | `1` |
| `session_id` | INT | Whole number | 4 bytes | Foreign key → `ai_sessions.session_id` | No | Links this record to `ai_sessions.session_id` | `1` |
| `execution_id` | TEXT | Free-form text | Variable | — | No | Stores the execution id value | `1` |
| `status` | TEXT | Free-form text | Variable | — | Yes | Stores the status value | `active` |
| `input_payload_json` | JSONB | JSON object or array | Variable | — | No | Stores the input payload json value | `{"step": 1}` |
| `output_payload_json` | JSONB | JSON object or array | Variable | — | No | Stores the output payload json value | `{"step": 1}` |
| `error_message` | TEXT | Free-form text | Variable | — | No | Stores the error message value | `Sample value` |
| `started_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time associated with started | `2026-09-07 10:30:00+08` |
| `ended_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | — | No | Date and time associated with ended | `2026-09-07 10:30:00+08` |

## `notifications`

**Purpose:** Stores and manages notifications.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `notification_id` | BIGINT | Whole number | 8 bytes | Primary key; Identity | Yes | Unique identifier for a record in `notifications` | `1` |
| `recipient_user_id` | INT | Whole number | 4 bytes | Foreign key → `users.user_id` | Yes | Links this record to `users.user_id` | `1` |
| `student_id` | INT | Whole number | 4 bytes | Foreign key → `student_profiles.student_id` | No | Links this record to `student_profiles.student_id` | `1` |
| `title` | TEXT | Free-form text | Variable | — | Yes | Stores the title value | `Sample value` |
| `message` | TEXT | Free-form text | Variable | — | Yes | Stores the message value | `Sample value` |
| `is_read` | BOOLEAN | TRUE or FALSE | 1 byte | Default: `FALSE` | Yes | Indicates whether read | `TRUE` |
| `created_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was created | `2026-09-07 10:30:00+08` |
| `read_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | — | No | Date and time associated with read | `2026-09-07 10:30:00+08` |

## `ocr_logs`

**Purpose:** Stores and manages ocr logs.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `ocr_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `ocr_logs` | `1` |
| `input_id` | INT | Whole number | 4 bytes | Foreign key → `student_inputs.input_id` | No | Links this record to `student_inputs.input_id` | `1` |
| `extracted_text` | TEXT | Free-form text | Variable | — | No | Text content for extracted | `Sample text` |
| `confidence_score` | NUMERIC(5,2) | Decimal (5,2) | Variable precision | — | No | Stores the confidence score value | `95.00` |
| `model_used` | TEXT | Free-form text | Variable | — | No | Stores the model used value | `Sample value` |
| `processing_status` | VARCHAR(255) | Text | 255 characters | — | No | Current processing status | `active` |
| `error_message` | TEXT | Free-form text | Variable | — | No | Stores the error message value | `Sample value` |
| `created_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was created | `2026-09-07 10:30:00+08` |

## `organization_members`

**Purpose:** Stores and manages organization members.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `organization_member_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `organization_members` | `1` |
| `organization_id` | INT | Whole number | 4 bytes | Foreign key → `organizations.organization_id` | Yes | Links this record to `organizations.organization_id` | `1` |
| `teacher_id` | INT | Whole number | 4 bytes | Foreign key → `teacher_profiles.teacher_id` | Yes | Links this record to `teacher_profiles.teacher_id` | `1` |
| `membership_role` | TEXT | Free-form text | Variable | Default: `'teacher'` | Yes | Stores the membership role value | `Sample value` |
| `is_active` | BOOLEAN | TRUE or FALSE | 1 byte | Default: `TRUE` | Yes | Indicates whether the record is active | `TRUE` |
| `joined_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time associated with joined | `2026-09-07 10:30:00+08` |
| `left_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | — | No | Date and time associated with left | `2026-09-07 10:30:00+08` |

## `organization_student_enrollments`

**Purpose:** Stores and manages organization student enrollments.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `organization_student_enrollment_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `organization_student_enrollments` | `1` |
| `organization_id` | INT | Whole number | 4 bytes | Foreign key → `organizations.organization_id` | Yes | Links this record to `organizations.organization_id` | `1` |
| `student_id` | INT | Whole number | 4 bytes | Foreign key → `student_profiles.student_id` | Yes | Links this record to `student_profiles.student_id` | `1` |
| `enrolled_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time associated with enrolled | `2026-09-07 10:30:00+08` |
| `left_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | — | No | Date and time associated with left | `2026-09-07 10:30:00+08` |
| `is_active` | BOOLEAN | TRUE or FALSE | 1 byte | Default: `TRUE` | Yes | Indicates whether the record is active | `TRUE` |

## `organizations`

**Purpose:** Stores and manages organizations.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `organization_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `organizations` | `1` |
| `organization_name` | VARCHAR(255) | Text | 255 characters | — | Yes | Name of the organization | `Sample name` |
| `organization_type` | TEXT | Free-form text | Variable | Default: `'school'` | Yes | Classification used for organization | `Sample value` |
| `contact_email` | TEXT | Free-form text | Variable | — | No | Stores the contact email value | `user@example.com` |
| `organization_status` | TEXT | Free-form text | Variable | Default: `'active'` | Yes | Current organization status | `active` |
| `created_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was created | `2026-09-07 10:30:00+08` |
| `updated_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was last updated | `2026-09-07 10:30:00+08` |

## `parent_profiles`

**Purpose:** Stores and manages parent profiles.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `parent_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `parent_profiles` | `1` |
| `user_id` | INT | Whole number | 4 bytes | Foreign key → `users.user_id` | No | Links this record to `users.user_id` | `1` |
| `contact_number` | SMALLINT | Whole number | 2 bytes | — | No | Stores the contact number value | `1` |
| `preferred_notification_channel` | TEXT | Free-form text | Variable | — | No | Stores the preferred notification channel value | `Sample value` |
| `created_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was created | `2026-09-07 10:30:00+08` |
| `updated_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was last updated | `2026-09-07 10:30:00+08` |
| `first_name` | TEXT | Free-form text | Variable | — | No | Name of the first | `Sample name` |
| `last_name` | TEXT | Free-form text | Variable | — | No | Name of the last | `Sample name` |
| `relationship` | TEXT | Free-form text | Variable | — | No | Stores the relationship value | `Sample value` |
| `notification_channels` | TEXT[] | Array of text values | Variable | — | No | Stores the notification channels value | `{fractions,geometry}` |
| `issetup_complete` | BOOLEAN | TRUE or FALSE | 1 byte | — | No | Stores the issetup complete value | `TRUE` |

## `payment_transactions`

**Purpose:** Stores and manages payment transactions.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `payment_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `payment_transactions` | `1` |
| `subscription_id` | INT | Whole number | 4 bytes | Foreign key → `subscriptions.subscription_id` | Yes | Links this record to `subscriptions.subscription_id` | `1` |
| `provider_payment_reference` | TEXT | Free-form text | Variable | Unique | No | Stores the provider payment reference value | `Sample value` |
| `amount` | NUMERIC(12, 2) | Decimal (12,2) | Variable precision | — | Yes | Stores the amount value | `95.00` |
| `currency_code` | CHAR(3) | Text | 3 characters | Default: `'PHP'` | Yes | Stores the currency code value | `PHP` |
| `payment_status` | TEXT | Free-form text | Variable | Default: `'pending'` | Yes | Current payment status | `active` |
| `paid_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | — | No | Date and time associated with paid | `2026-09-07 10:30:00+08` |
| `created_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was created | `2026-09-07 10:30:00+08` |

## `prompt_usage_logs`

**Purpose:** Stores and manages prompt usage logs.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `usage_id` | BIGINT | Whole number | 8 bytes | Primary key; Identity | Yes | Unique identifier for a record in `prompt_usage_logs` | `1` |
| `session_id` | INT | Whole number | 4 bytes | Foreign key → `ai_sessions.session_id` | Yes | Links this record to `ai_sessions.session_id` | `1` |
| `prompt_id` | INT | Whole number | 4 bytes | Foreign key → `system_prompts.prompt_id` | Yes | Links this record to `system_prompts.prompt_id` | `1` |
| `model_used` | TEXT | Free-form text | Variable | — | Yes | Stores the model used value | `Sample value` |
| `temperature` | NUMERIC(3,2) | Decimal (3,2) | Variable precision | — | No | Stores the temperature value | `95.00` |
| `input_token_count` | INT | Whole number | 4 bytes | Default: `0` | Yes | Number of input token | `1` |
| `output_token_count` | INT | Whole number | 4 bytes | Default: `0` | Yes | Number of output token | `1` |
| `created_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was created | `2026-09-07 10:30:00+08` |

## `reward_transactions`

**Purpose:** Stores and manages reward transactions.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `reward_id` | BIGINT | Whole number | 8 bytes | Primary key; Identity | Yes | Unique identifier for a record in `reward_transactions` | `1` |
| `student_id` | INT | Whole number | 4 bytes | Foreign key → `student_profiles.student_id` | Yes | Links this record to `student_profiles.student_id` | `1` |
| `session_id` | INT | Whole number | 4 bytes | Foreign key → `ai_sessions.session_id` | No | Links this record to `ai_sessions.session_id` | `1` |
| `reward_reason` | TEXT | Free-form text | Variable | — | Yes | Stores the reward reason value | `Sample value` |
| `created_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was created | `2026-09-07 10:30:00+08` |

## `roles`

**Purpose:** Stores and manages roles.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `role_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `roles` | `1` |
| `role_name` | VARCHAR(255) | Text | 255 characters | — | Yes | Name of the role | `Sample name` |
| `description` | TEXT | Free-form text | Variable | — | No | Provides additional details about the record | `Sample text` |
| `created_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was created | `2026-09-07 10:30:00+08` |

## `session_states`

**Purpose:** Stores and manages session states.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `state_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `session_states` | `1` |
| `session_id` | INT | Whole number | 4 bytes | Foreign key → `ai_sessions.session_id` | No | Links this record to `ai_sessions.session_id` | `1` |
| `current_problem_step` | TEXT | Free-form text | Variable | — | No | Stores the current problem step value | `Sample value` |
| `expected_next_action` | TEXT | Free-form text | Variable | — | No | Stores the expected next action value | `Sample value` |
| `failed_attempt_count` | INT | Whole number | 4 bytes | — | No | Number of failed attempt | `1` |
| `help_request_count` | INT | Whole number | 4 bytes | — | No | Number of help request | `1` |
| `last_response_outcome` | INT | Whole number | 4 bytes | — | No | Stores the last response outcome value | `1` |
| `hint_level` | INT | Whole number | 4 bytes | — | No | Stores the hint level value | `1` |
| `dda_triggered` | INT | Whole number | 4 bytes | — | No | Stores the dda triggered value | `1` |
| `show_me_triggered` | INT | Whole number | 4 bytes | — | No | Stores the show me triggered value | `1` |
| `state_json` | JSON | JSON object or array | Variable | — | No | Stores the state json value | `{"step": 1}` |
| `updated_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was last updated | `2026-09-07 10:30:00+08` |

## `show_me_breakdowns`

**Purpose:** Stores and manages show me breakdowns.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `breakdown_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `show_me_breakdowns` | `1` |
| `session_id` | INT | Whole number | 4 bytes | Foreign key → `ai_sessions.session_id` | Yes | Links this record to `ai_sessions.session_id` | `1` |
| `skill_id` | INT | Whole number | 4 bytes | Foreign key → `math_skills.skill_id` | Yes | Links this record to `math_skills.skill_id` | `1` |
| `example_problem_text` | TEXT | Free-form text | Variable | — | Yes | Text content for example problem | `Sample text` |
| `animation_file_id` | INT | Whole number | 4 bytes | — | No | Stores the animation file id value | `1` |
| `explanation_steps` | JSONB | JSON object or array | Variable | — | Yes | Stores the explanation steps value | `{"step": 1}` |
| `created_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was created | `2026-09-07 10:30:00+08` |

## `speech_to_text_logs`

**Purpose:** Stores and manages speech to text logs.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `stt_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `speech_to_text_logs` | `1` |
| `input_id` | INT | Whole number | 4 bytes | Foreign key → `student_inputs.input_id` | No | Links this record to `student_inputs.input_id` | `1` |
| `transcript_text` | TEXT | Free-form text | Variable | — | No | Text content for transcript | `Sample text` |
| `confidence_score` | SMALLINT | Whole number | 2 bytes | — | No | Stores the confidence score value | `1` |
| `model_used` | TEXT | Free-form text | Variable | — | No | Stores the model used value | `Sample value` |
| `processing_status` | VARCHAR(255) | Text | 255 characters | — | No | Current processing status | `active` |
| `error_message` | TEXT | Free-form text | Variable | — | No | Stores the error message value | `Sample value` |
| `created_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was created | `2026-09-07 10:30:00+08` |

## `student_attempts`

**Purpose:** Stores and manages student attempts.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `attempt_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `student_attempts` | `1` |
| `session_id` | INT | Whole number | 4 bytes | Foreign key → `ai_sessions.session_id` | No | Links this record to `ai_sessions.session_id` | `1` |
| `problem_id` | INT | Whole number | 4 bytes | Foreign key → `math_problems.problem_id` | No | Links this record to `math_problems.problem_id` | `1` |
| `student_id` | INT | Whole number | 4 bytes | Foreign key → `student_profiles.student_id` | No | Links this record to `student_profiles.student_id` | `1` |
| `submitted_answer` | TEXT | Free-form text | Variable | — | No | Stores the submitted answer value | `Sample value` |
| `is_correct` | BOOLEAN | TRUE or FALSE | 1 byte | — | No | Indicates whether correct | `TRUE` |
| `score` | NUMERIC(5,2) | Decimal (5,2) | Variable precision | — | No | Stores the score value | `95.00` |
| `time_spent_seconds` | INT | Whole number | 4 bytes | — | No | Stores the time spent seconds value | `1` |
| `attempt_number` | SMALLINT | Whole number | 2 bytes | Default: `0` | Yes | Stores the attempt number value | `1` |
| `created_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was created | `2026-09-07 10:30:00+08` |

## `student_avatar_items`

**Purpose:** Stores and manages student avatar items.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `student_id` | INT | Whole number | 4 bytes | Primary key; Foreign key → `student_profiles.student_id` | Yes | Unique identifier for a record in `student_avatar_items` | `1` |
| `item_id` | INT | Whole number | 4 bytes | Primary key; Foreign key → `avatar_items.item_id` | Yes | Unique identifier for a record in `student_avatar_items` | `1` |
| `unlocked_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time associated with unlocked | `2026-09-07 10:30:00+08` |
| `equipped` | BOOLEAN | TRUE or FALSE | 1 byte | Default: `FALSE` | Yes | Stores the equipped value | `TRUE` |

## `student_help_events`

**Purpose:** Stores and manages student help events.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `help_event_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `student_help_events` | `1` |
| `session_id` | INT | Whole number | 4 bytes | Foreign key → `ai_sessions.session_id` | Yes | Links this record to `ai_sessions.session_id` | `1` |
| `student_id` | INT | Whole number | 4 bytes | Foreign key → `student_profiles.student_id` | Yes | Links this record to `student_profiles.student_id` | `1` |
| `message_id` | INT | Whole number | 4 bytes | Foreign key → `ai_messages.message_id` | No | Links this record to `ai_messages.message_id` | `1` |
| `problem_id` | INT | Whole number | 4 bytes | Foreign key → `math_problems.problem_id` | No | Links this record to `math_problems.problem_id` | `1` |
| `skill_id` | INT | Whole number | 4 bytes | Foreign key → `math_skills.skill_id` | No | Links this record to `math_skills.skill_id` | `1` |
| `help_type` | TEXT | Free-form text | Variable | — | Yes | Classification used for help | `Sample value` |
| `triggered_strategy` | TEXT | Free-form text | Variable | — | No | Stores the triggered strategy value | `Sample value` |
| `wrong_attempt_count_at_event` | INT | Whole number | 4 bytes | Default: `0` | Yes | Stores the wrong attempt count at event value | `1` |
| `created_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was created | `2026-09-07 10:30:00+08` |

## `student_inputs`

**Purpose:** Stores and manages student inputs.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `input_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `student_inputs` | `1` |
| `student_id` | INT | Whole number | 4 bytes | Foreign key → `ai_sessions.student_id` | No | Links this record to `ai_sessions.student_id` | `1` |
| `session_id` | INT | Whole number | 4 bytes | Foreign key → `ai_sessions.session_id` | No | Links this record to `ai_sessions.session_id` | `1` |
| `input_type` | TEXT | Free-form text | Variable | Default: `'inputUnknown'` | No | Classification used for input | `Sample value` |
| `raw_file_id` | INT | Whole number | 4 bytes | Foreign key → `file_assets.file_id` | No | Links this record to `file_assets.file_id` | `1` |
| `raw_text` | TEXT | Free-form text | Variable | — | No | Text content for raw | `Sample text` |
| `extracted_text` | TEXT | Free-form text | Variable | — | No | Text content for extracted | `Sample text` |
| `processing_status` | BOOLEAN | TRUE or FALSE | 1 byte | — | No | Current processing status | `TRUE` |
| `created_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was created | `2026-09-07 10:30:00+08` |

## `student_login_challenges`

**Purpose:** Stores and manages student login challenges.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `challenge_id` | UUID | UUID string | 16 bytes | Primary key; Default: `gen_random_uuid()` | Yes | Unique identifier for a record in `student_login_challenges` | `1` |
| `student_id` | INT | Whole number | 4 bytes | Foreign key → `student_profiles.student_id` | Yes | Links this record to `student_profiles.student_id` | `1` |
| `issued_by_parent_id` | INT | Whole number | 4 bytes | Foreign key → `parent_profiles.parent_id` | No | Links this record to `parent_profiles.parent_id` | `1` |
| `issued_by_teacher_id` | INT | Whole number | 4 bytes | Foreign key → `teacher_profiles.teacher_id` | No | Links this record to `teacher_profiles.teacher_id` | `1` |
| `challenge_type` | TEXT | Free-form text | Variable | — | Yes | Classification used for challenge | `Sample value` |
| `public_code` | VARCHAR(20) | Text | 20 characters | — | No | Stores the public code value | `Sample value` |
| `secret_hash` | TEXT | Free-form text | Variable | — | Yes | Stores the secret hash value | `Sample value` |
| `expires_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | — | Yes | Date and time associated with expires | `2026-09-07 10:30:00+08` |
| `used_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | — | No | Date and time associated with used | `2026-09-07 10:30:00+08` |
| `revoked_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | — | No | Date and time associated with revoked | `2026-09-07 10:30:00+08` |
| `failed_attempt_count` | INT | Whole number | 4 bytes | Default: `0` | Yes | Number of failed attempt | `1` |
| `maximum_attempt_count` | INT | Whole number | 4 bytes | Default: `5` | Yes | Number of maximum attempt | `1` |
| `created_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was created | `2026-09-07 10:30:00+08` |

## `student_parent_links`

**Purpose:** Stores and manages student parent links.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `student_parent_link_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `student_parent_links` | `1` |
| `student_id` | INT | Whole number | 4 bytes | Foreign key → `student_profiles.student_id` | No | Links this record to `student_profiles.student_id` | `1` |
| `parent_id` | INT | Whole number | 4 bytes | Foreign key → `parent_profiles.parent_id` | No | Links this record to `parent_profiles.parent_id` | `1` |
| `relationship_type` | TEXT | Free-form text | Variable | — | No | Classification used for relationship | `Sample value` |
| `is_primary_guardian` | BOOLEAN | TRUE or FALSE | 1 byte | — | No | Indicates whether primary guardian | `TRUE` |
| `created_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was created | `2026-09-07 10:30:00+08` |

## `student_profiles`

**Purpose:** Stores and manages student profiles.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `student_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `student_profiles` | `1` |
| `user_id` | INT | Whole number | 4 bytes | Foreign key → `users.user_id`; Unique | Yes | Links this record to `users.user_id` | `1` |
| `section_id` | INT | Whole number | 4 bytes | Foreign key → `class_sections.section_id` | No | Links this record to `class_sections.section_id` | `1` |
| `grade_level` | SMALLINT | Whole number | 2 bytes | — | No | Stores the grade level value | `5` |
| `interests` | TEXT[] | Array of text values | Variable | Default: `ARRAY[]::TEXT[]` | Yes | Stores the interests value | `{fractions,geometry}` |
| `avatar_id` | INT | Whole number | 4 bytes | Foreign key → `avatars.avatar_id` | No | Links this record to `avatars.avatar_id` | `1` |
| `total_star_points` | DOUBLE PRECISION | Decimal number | 8 bytes | — | No | Stores the total star points value | `95.00` |
| `current_streak` | INT | Whole number | 4 bytes | — | No | Stores the current streak value | `1` |
| `learning_status` | TEXT | Free-form text | Variable | Default: `'not_assessed'` | Yes | Current learning status | `active` |
| `created_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was created | `2026-09-07 10:30:00+08` |
| `updated_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was last updated | `2026-09-07 10:30:00+08` |
| `interests` | TEXT[] | Array of text values | Variable | — | No | Stores the interests value | `{fractions,geometry}` |
| `first_name` | TEXT | Free-form text | Variable | — | No | Name of the first | `Sample name` |
| `last_name` | TEXT | Free-form text | Variable | — | No | Name of the last | `Sample name` |
| `birthdate` | TEXT | Free-form text | Variable | — | No | Stores the birthdate value | `Sample value` |

## `student_section_enrollments`

**Purpose:** Stores and manages student section enrollments.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `enrollment_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `student_section_enrollments` | `1` |
| `student_id` | INT | Whole number | 4 bytes | Foreign key → `student_profiles.student_id` | Yes | Links this record to `student_profiles.student_id` | `1` |
| `section_id` | INT | Whole number | 4 bytes | Foreign key → `class_sections.section_id` | Yes | Links this record to `class_sections.section_id` | `1` |
| `enrolled_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | — | Yes | Date and time associated with enrolled | `2026-09-07 10:30:00+08` |
| `ended_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | — | No | Date and time associated with ended | `2026-09-07 10:30:00+08` |
| `is_active` | BOOLEAN | TRUE or FALSE | 1 byte | Default: `TRUE` | Yes | Indicates whether the record is active | `TRUE` |
| `created_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was created | `2026-09-07 10:30:00+08` |
| `updated_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was last updated | `2026-09-07 10:30:00+08` |

## `student_skill_features`

**Purpose:** Stores and manages student skill features.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `feature_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `student_skill_features` | `1` |
| `student_id` | INT | Whole number | 4 bytes | Foreign key → `student_profiles.student_id` | Yes | Links this record to `student_profiles.student_id` | `1` |
| `skill_id` | INT | Whole number | 4 bytes | Foreign key → `math_skills.skill_id` | Yes | Links this record to `math_skills.skill_id` | `1` |
| `total_attempts` | INT | Whole number | 4 bytes | Default: `0` | Yes | Stores the total attempts value | `1` |
| `correct_attempts` | INT | Whole number | 4 bytes | Default: `0` | Yes | Stores the correct attempts value | `1` |
| `accuracy_rate` | NUMERIC(5,4) | Decimal (5,4) | Variable precision | — | No | Stores the accuracy rate value | `95.00` |
| `avg_time_spent` | NUMERIC(10,2) | Decimal (10,2) | Variable precision | — | No | Stores the avg time spent value | `95.00` |
| `hint_usage_rate` | NUMERIC(5,4) | Decimal (5,4) | Variable precision | — | No | Stores the hint usage rate value | `95.00` |
| `help_request_count` | INT | Whole number | 4 bytes | Default: `0` | Yes | Number of help request | `1` |
| `help_request_rate` | NUMERIC(5,4) | Decimal (5,4) | Variable precision | — | No | Stores the help request rate value | `95.00` |
| `failed_loop_count` | INT | Whole number | 4 bytes | Default: `0` | Yes | Number of failed loop | `1` |
| `dda_trigger_count` | INT | Whole number | 4 bytes | Default: `0` | Yes | Number of dda trigger | `1` |
| `show_me_count` | INT | Whole number | 4 bytes | Default: `0` | Yes | Number of show me | `1` |
| `recent_score_avg` | NUMERIC(5,2) | Decimal (5,2) | Variable precision | — | No | Stores the recent score avg value | `95.00` |
| `last_attempt_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | — | No | Date and time associated with last attempt | `2026-09-07 10:30:00+08` |
| `updated_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was last updated | `2026-09-07 10:30:00+08` |

## `student_skill_predictions`

**Purpose:** Stores and manages student skill predictions.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `prediction_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `student_skill_predictions` | `1` |
| `student_id` | INT | Whole number | 4 bytes | Foreign key → `student_profiles.student_id` | Yes | Links this record to `student_profiles.student_id` | `1` |
| `skill_id` | INT | Whole number | 4 bytes | Foreign key → `math_skills.skill_id` | Yes | Links this record to `math_skills.skill_id` | `1` |
| `predicted_mastery_score` | NUMERIC(5,4) | Decimal (5,4) | Variable precision | — | No | Stores the predicted mastery score value | `95.00` |
| `risk_level` | TEXT | Free-form text | Variable | — | No | Stores the risk level value | `Sample value` |
| `recommended_difficulty_id` | INT | Whole number | 4 bytes | Foreign key → `difficulty_levels.difficulty_id` | No | Links this record to `difficulty_levels.difficulty_id` | `1` |
| `recommended_action` | TEXT | Free-form text | Variable | — | No | Stores the recommended action value | `Sample value` |
| `model_version_id` | INT | Whole number | 4 bytes | Foreign key → `ml_models.model_version_id` | Yes | Links this record to `ml_models.model_version_id` | `1` |
| `predicted_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time associated with predicted | `2026-09-07 10:30:00+08` |

## `student_teacher_links`

**Purpose:** Stores and manages student teacher links.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `student_teacher_link_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `student_teacher_links` | `1` |
| `student_id` | INT | Whole number | 4 bytes | Foreign key → `student_profiles.student_id` | Yes | Links this record to `student_profiles.student_id` | `1` |
| `teacher_id` | INT | Whole number | 4 bytes | Foreign key → `teacher_profiles.teacher_id` | Yes | Links this record to `teacher_profiles.teacher_id` | `1` |
| `section_id` | INT | Whole number | 4 bytes | Foreign key → `class_sections.section_id` | No | Links this record to `class_sections.section_id` | `1` |
| `is_active` | BOOLEAN | TRUE or FALSE | 1 byte | Default: `TRUE` | Yes | Indicates whether the record is active | `TRUE` |

## `subscription_plans`

**Purpose:** Stores and manages subscription plans.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `plan_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `subscription_plans` | `1` |
| `plan_code` | VARCHAR(50) | Text | 50 characters | Unique | Yes | Stores the plan code value | `Sample value` |
| `plan_name` | VARCHAR(100) | Text | 100 characters | — | Yes | Name of the plan | `Sample name` |
| `coverage_type` | TEXT | Free-form text | Variable | — | Yes | Classification used for coverage | `Sample value` |
| `billing_model` | TEXT | Free-form text | Variable | — | Yes | Stores the billing model value | `Sample value` |
| `price_amount` | NUMERIC(12, 2) | Decimal (12,2) | Variable precision | Default: `0` | Yes | Stores the price amount value | `95.00` |
| `currency_code` | CHAR(3) | Text | 3 characters | Default: `'PHP'` | Yes | Stores the currency code value | `PHP` |
| `access_duration_months` | INT | Whole number | 4 bytes | — | No | Stores the access duration months value | `1` |
| `is_lifetime` | BOOLEAN | TRUE or FALSE | 1 byte | Default: `FALSE` | Yes | Indicates whether lifetime | `TRUE` |
| `default_seat_limit` | INT | Whole number | 4 bytes | — | No | Stores the default seat limit value | `1` |
| `is_active` | BOOLEAN | TRUE or FALSE | 1 byte | Default: `TRUE` | Yes | Indicates whether the record is active | `TRUE` |
| `created_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was created | `2026-09-07 10:30:00+08` |
| `updated_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was last updated | `2026-09-07 10:30:00+08` |

## `subscription_students`

**Purpose:** Stores and manages subscription students.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `subscription_student_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `subscription_students` | `1` |
| `subscription_id` | INT | Whole number | 4 bytes | Foreign key → `subscriptions.subscription_id` | Yes | Links this record to `subscriptions.subscription_id` | `1` |
| `student_id` | INT | Whole number | 4 bytes | Foreign key → `student_profiles.student_id` | Yes | Links this record to `student_profiles.student_id` | `1` |
| `assigned_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time associated with assigned | `2026-09-07 10:30:00+08` |
| `removed_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | — | No | Date and time associated with removed | `2026-09-07 10:30:00+08` |
| `is_active` | BOOLEAN | TRUE or FALSE | 1 byte | Default: `TRUE` | Yes | Indicates whether the record is active | `TRUE` |

## `subscriptions`

**Purpose:** Stores and manages subscriptions.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `subscription_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `subscriptions` | `1` |
| `billing_account_id` | INT | Whole number | 4 bytes | Foreign key → `billing_accounts.billing_account_id` | Yes | Links this record to `billing_accounts.billing_account_id` | `1` |
| `plan_id` | INT | Whole number | 4 bytes | Foreign key → `subscription_plans.plan_id` | Yes | Links this record to `subscription_plans.plan_id` | `1` |
| `provider_subscription_reference` | TEXT | Free-form text | Variable | Unique | No | Stores the provider subscription reference value | `Sample value` |
| `subscription_status` | TEXT | Free-form text | Variable | Default: `'pending'` | Yes | Current subscription status | `active` |
| `purchased_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time associated with purchased | `2026-09-07 10:30:00+08` |
| `access_starts_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time associated with access starts | `2026-09-07 10:30:00+08` |
| `access_ends_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | — | No | Date and time associated with access ends | `2026-09-07 10:30:00+08` |
| `is_lifetime` | BOOLEAN | TRUE or FALSE | 1 byte | Default: `FALSE` | Yes | Indicates whether lifetime | `TRUE` |
| `auto_renew` | BOOLEAN | TRUE or FALSE | 1 byte | Default: `FALSE` | Yes | Stores the auto renew value | `TRUE` |
| `seat_limit` | INT | Whole number | 4 bytes | — | No | Stores the seat limit value | `1` |
| `cancelled_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | — | No | Date and time associated with cancelled | `2026-09-07 10:30:00+08` |
| `created_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was created | `2026-09-07 10:30:00+08` |
| `updated_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was last updated | `2026-09-07 10:30:00+08` |

## `system_prompts`

**Purpose:** Stores and manages system prompts.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `prompt_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `system_prompts` | `1` |
| `prompt_name` | TEXT | Free-form text | Variable | — | Yes | Name of the prompt | `Sample name` |
| `prompt_version` | TEXT | Free-form text | Variable | — | Yes | Stores the prompt version value | `Sample value` |
| `prompt_text` | TEXT | Free-form text | Variable | — | Yes | Text content for prompt | `Sample text` |
| `prompt_type` | TEXT | Free-form text | Variable | — | Yes | Classification used for prompt | `Sample value` |
| `is_active` | BOOLEAN | TRUE or FALSE | 1 byte | Default: `TRUE` | Yes | Indicates whether the record is active | `TRUE` |
| `created_by_user_id` | INT | Whole number | 4 bytes | Foreign key → `users.user_id` | No | Links this record to `users.user_id` | `1` |
| `created_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was created | `2026-09-07 10:30:00+08` |
| `updated_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was last updated | `2026-09-07 10:30:00+08` |

## `teacher_profiles`

**Purpose:** Stores and manages teacher profiles.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `teacher_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `teacher_profiles` | `1` |
| `user_id` | INT | Whole number | 4 bytes | Foreign key → `users.user_id` | Yes | Links this record to `users.user_id` | `1` |
| `employee_number` | VARCHAR(50) | Text | 50 characters | Unique | No | Stores the employee number value | `Sample value` |
| `specialization` | TEXT | Free-form text | Variable | — | No | Stores the specialization value | `Sample value` |
| `created_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was created | `2026-09-07 10:30:00+08` |
| `updated_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was last updated | `2026-09-07 10:30:00+08` |

## `text_to_speech_logs`

**Purpose:** Stores and manages text to speech logs.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `tts_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `text_to_speech_logs` | `1` |
| `message_id` | INT | Whole number | 4 bytes | Foreign key → `ai_messages.message_id` | No | Links this record to `ai_messages.message_id` | `1` |
| `generated_audio_file_id` | INT | Whole number | 4 bytes | Foreign key → `file_assets.file_id` | No | Links this record to `file_assets.file_id` | `1` |
| `voice_model` | TEXT | Free-form text | Variable | — | No | Stores the voice model value | `Sample value` |
| `text_used` | TEXT | Free-form text | Variable | — | No | Stores the text used value | `Sample text` |
| `processing_status` | VARCHAR(255) | Text | 255 characters | — | No | Current processing status | `active` |
| `error_message` | TEXT | Free-form text | Variable | — | No | Stores the error message value | `Sample value` |
| `created_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was created | `2026-09-07 10:30:00+08` |

## `user_auth`

**Purpose:** Stores and manages user auth.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `auth_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `user_auth` | `1` |

## `users`

**Purpose:** Stores and manages users.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `user_id` | INT | Whole number | 4 bytes | Primary key; Identity | Yes | Unique identifier for a record in `users` | `1` |
| `auth_id` | UUID | UUID string | 16 bytes | — | No | Stores the auth id value | `1` |
| `role_id` | INT | Whole number | 4 bytes | Foreign key → `roles.role_id` | No | Links this record to `roles.role_id` | `1` |
| `email` | TEXT | Free-form text | Variable | — | Yes | Stores the email value | `user@example.com` |
| `is_active` | BOOLEAN | TRUE or FALSE | 1 byte | — | Yes | Indicates whether the record is active | `TRUE` |

## `vector_records`

**Purpose:** Stores and manages vector records.

| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |
|---|---|---|---|---|---|---|---|
| `vector_record_id` | BIGINT | Whole number | 8 bytes | Primary key; Identity | Yes | Unique identifier for a record in `vector_records` | `1` |
| `student_id` | INT | Whole number | 4 bytes | Foreign key → `student_profiles.student_id` | No | Links this record to `student_profiles.student_id` | `1` |
| `session_id` | INT | Whole number | 4 bytes | Foreign key → `ai_sessions.session_id` | No | Links this record to `ai_sessions.session_id` | `1` |
| `search_status` | TEXT | Free-form text | Variable | Default: `'pending'` | Yes | Current search status | `active` |
| `indexed_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | — | No | Date and time associated with indexed | `2026-09-07 10:30:00+08` |
| `last_error` | TEXT | Free-form text | Variable | — | No | Stores the last error value | `Sample value` |
| `content_hast` | TEXT | Free-form text | Variable | — | No | Stores the content hast value | `Sample value` |
| `updated_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was last updated | `2026-09-07 10:30:00+08` |
| `namespace` | TEXT | Free-form text | Variable | — | Yes | Stores the namespace value | `Sample name` |
| `source_type` | TEXT | Free-form text | Variable | — | Yes | Classification used for source | `Sample value` |
| `source_id` | INT | Whole number | 4 bytes | — | Yes | Stores the source id value | `1` |
| `embedding_id` | TEXT | Free-form text | Variable | — | Yes | Stores the embedding id value | `1` |
| `metadata_json` | JSONB | JSON object or array | Variable | — | No | Stores the metadata json value | `{"step": 1}` |
| `created_at` | TIMESTAMPTZ | YYYY-MM-DD HH:MM:SS±TZ | 8 bytes | Default: `NOW()` | Yes | Date and time the record was created | `2026-09-07 10:30:00+08` |
