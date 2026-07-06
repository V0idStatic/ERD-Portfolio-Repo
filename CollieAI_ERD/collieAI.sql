
-- 1.) User and Access
CREATE TABLE user_auth
(
 auth_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
);

CREATE TABLE roles
(
 role_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 role_name VARCHAR(255) NOT NULL,
 description TEXT,
 created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users
(
 user_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 auth_id UUID, --fk
 role_id INT, --fk
 email TEXT NOT NULL,
 is_active BOOLEAN NOT NULL
);

CREATE TABLE class_sections
(
 section_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 section_name VARCHAR(55) NOT NULL,
 grade_level SMALLINT NOT NULL,
 school_YEAR INT NOT NULL,
 teacher_id INT NOT NULL, -- fk
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE student_profiles
(
 student_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 section_id INT, --fk
 avatar_id INT, -- fk
 total_star_points DOUBLE PRECISION,
 current_streak INT,
 learning_status TEXT NOT NULL DEFAULT 'not_assessed',
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE parent_profiles
(
 parent_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 role_id INT, --fk
 contact_number SMALLINT,
 preferred_notification_channel TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );

 CREATE TABLE student_parent_links
 (
 student_parent_link_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 student_id INT, --fk
 parent_id INT, --fk
 relationship_type TEXT,
 is_primary_guardian BOOLEAN,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()   
 );

 -- 2.) Learning Content

 CREATE TABLE math_topics
 (
 topic_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 topic_name VARCHAR(255),
 description TEXT,
 grade_level SMALLINT,
 display_order INT,
 is_active BOOLEAN,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

 CREATE TABLE math_skills
 (
 skill_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 topic_id INT, --fk
 skill_name VARCHAR(255),
 skill_description TEXT,
 grade_level SMALLINT,
 display_order INT,
 is_active BOOLEAN,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 
 );  

 CREATE TABLE difficulty_levels
 (
 difficulty_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 difficulty_name VARCHAR(255),
 numerical_value NUMERIC(5,2),
 description TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );

 CREATE TABLE math_problems
 (
 problem_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 skill_id INT, --fk
 difficulty_id INT, --fk
 problem_text TEXT,
 correct_answer DOUBLE PRECISION,
 solution_pattern TEXT NOT NULL 
 );

  -- 3.) Multimodal Input

 CREATE TABLE student_inputs
 (
 input_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 student_id INT, --fk
 session_id INT, --fk
 input_type TEXT DEFAULT 'inputUnknown',
 raw_file_id INT, --fk
 raw_text TEXT,
 extracted_text TEXT,
 processing_status BOOLEAN,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );

 CREATE TABLE file_assets
 (
 file_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 owner_user_id INT, --fk
 file_type TEXT,
 file_url TEXT,
 mime_type TEXT,
 file_size_bytes BIGINT,
 storage_provider TEXT,
 checksum BOOLEAN,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );

 CREATE TABLE ocr_logs
 (
 ocr_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 input_id INT, --fk
 extracted_text TEXT,
 confidence_score NUMERIC(5,2),
 model_used TEXT,
 processing_status VARCHAR(255),
 error_message TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );

 CREATE TABLE speech_to_text_logs
 (
 stt_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 input_id INT, --fk
 transcript_text TEXT,
 confidence_score SMALLINT,
 model_used TEXT,
 processing_status VARCHAR(255),
 error_message TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );

 CREATE TABLE text_to_speech_logs
 (
 tts_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 message_id INT, --fk
 generated_audio_file_id INT, --fk
 voice_model TEXT,
 text_used TEXT,
 processing_status VARCHAR(255),
 error_message TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );

  -- 4.) AI Tutoring & State
 CREATE TABLE ai_sessions
 (
 session_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 student_id INT, --fk
 problem_id INT, --fk
 session_status VARCHAR(255),
 started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 ended_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );

 CREATE TABLE ai_messages
 (
 message_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 session_id INT, --fk
 sender INT,
 message_text VARCHAR(255),
 message_type VARCHAR(255),
 token_count INT,
 created_At TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );

 CREATE TABLE session_states
 (
 state_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 session_id INT, --fk
 current_problem_step TEXT,
 expected_next_action TEXT,
 failed_attempt_count INT,
 help_request_count INT,
 last_response_outcome INT,
 hint_level INT,
 dda_triggered INT,
 show_me_triggered INT,
 state_json JSON,    
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );

   -- 5.) AI Tutoring & State

 CREATE TABLE student_attempts
 (
 attempt_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 session_id INT, --fk
 problem_id INT, --fk
 submitted_answer TEXT,
 is_correct BOOLEAN,
 score NUMERIC (5,2),
 time_spent_seconds INT,
 attempt_number SMALLINT NOT NULL DEFAULT 0,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );

 CREATE TABLE attempt_steps
 (
 step_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 attempt_id INT, --fk
 step_number SMALLINT NOT NULL,
 student_step_answer TEXT,
 ai_feedback TEXT,
 is_step_correct BOOLEAN,
 hint_used SMALLINT NOT NULL DEFAULT 0,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()   
 );

  -- 6.) Adaptive Learning / DDA

 CREATE TABLE dda_events
 (
 dda_event_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 session_id INT, --fk
 student_id INT, --fk
 skill_id INT, --fk
 trigger_reason TEXT NOT NULL,
 previous_difficulty_id INT, --fk
 new_difficulty_id INT NOT NULL, --fk
 visual_analogy_used TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );

 CREATE TABLE show_me_breakdowns
 (
 breakdown_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 session_id INT NOT NULL, --fk
 skill_id INT NOT NULL, --fk
 example_problem_text TEXT NOT NULL,
 animation_file_id INT, --fk
 explanation_steps JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

 );
 CREATE TABLE student_help_events
 (
 help_event_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 session_id INT NOT NULL, --fk
 student_id INT NOT NULL, --fk
 message_id INT, --fk
 problem_id INT, --fk
 skill_id INT, --fk
 help_type TEXT NOT NULL,
 triggered_strategy TEXT,
 wrong_attempt_count_at_event INT NOT NULL DEFAULT 0,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

 );

  -- 7.) Guardrails & Prompt Safety

 CREATE TABLE guardrail_checks (
 guardrail_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 message_id INT, -- fk
 is_math_related BOOLEAN,
 prompt_injection_detected BOOLEAN NOT NULL DEFAULT FALSE,
 violation_type TEXT,
 action_taken TEXT,
 confidence_score NUMERIC(5,4),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

 CREATE TABLE system_prompts (
 prompt_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 prompt_name TEXT NOT NULL,
 prompt_version TEXT NOT NULL,
 prompt_text TEXT NOT NULL,
 prompt_type TEXT NOT NULL,
 is_active BOOLEAN NOT NULL DEFAULT TRUE,
 created_by_user_id INT, -- fk
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE prompt_usage_logs (
 usage_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 session_id INT NOT NULL, -- fk
 prompt_id INT NOT NULL, -- fk
 model_used TEXT NOT NULL,
 temperature NUMERIC(3,2),
 input_token_count INT NOT NULL DEFAULT 0,
 output_token_count INT NOT NULL DEFAULT 0,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
 
  -- 8.) Machine Learning

CREATE TABLE student_skill_features (
 feature_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 student_id INT NOT NULL, -- fk
 skill_id INT NOT NULL, -- fk
 total_attempts INT NOT NULL DEFAULT 0,
 correct_attempts INT NOT NULL DEFAULT 0,
 accuracy_rate NUMERIC(5,4),
 avg_time_spent NUMERIC(10,2),
 hint_usage_rate NUMERIC(5,4),
 help_request_count INT NOT NULL DEFAULT 0,
 help_request_rate NUMERIC(5,4),
 failed_loop_count INT NOT NULL DEFAULT 0,
 dda_trigger_count INT NOT NULL DEFAULT 0,
 show_me_count INT NOT NULL DEFAULT 0,
 recent_score_avg NUMERIC(5,2),
 last_attempt_at TIMESTAMPTZ,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE student_skill_predictions (
 prediction_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 student_id INT NOT NULL, -- fk
 skill_id INT NOT NULL, -- fk
 predicted_mastery_score NUMERIC(5,4),
 risk_level TEXT,
 recommended_difficulty_id INT, -- fk
 recommended_action TEXT,
 model_version_id INT NOT NULL, -- fk
 predicted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ml_models (
 model_version_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 model_name TEXT NOT NULL,
 algorithm TEXT NOT NULL,
 training_date DATE,
 accuracy_score NUMERIC(5,4),
 precision_score NUMERIC(5,4),
 recall_score NUMERIC(5,4),
 f1_score NUMERIC(5,4),
 notes TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

  -- 9.) Recommendation System

CREATE TABLE learning_recommendations (
 recommendation_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 student_id INT NOT NULL, -- fk
 skill_id INT NOT NULL, -- fk
 prediction_id INT, -- fk, nullable if recommendation can be manual/rule-based
 recommendation_type TEXT NOT NULL,
 recommendation_text TEXT NOT NULL,
 target_user_type TEXT NOT NULL,
 priority_level SMALLINT NOT NULL DEFAULT 3,
 is_completed BOOLEAN NOT NULL DEFAULT FALSE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 completed_at TIMESTAMPTZ
);

  -- 10.) Gamitfication & Rewards
CREATE TABLE avatars (
 avatar_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 avatar_name TEXT NOT NULL,
 avatar_type TEXT NOT NULL,
 default_asset_file_id INT, -- fk
 is_default BOOLEAN NOT NULL DEFAULT FALSE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reward_transactions (
 reward_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 student_id INT NOT NULL, -- fk
 session_id INT, -- fk, nullable if reward can be given outside a session
 points_earned INT NOT NULL,
 reward_reason TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE avatar_items (
 item_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 item_name TEXT NOT NULL,
 item_type TEXT NOT NULL,
 cost_points INT NOT NULL DEFAULT 0,
 asset_file_id INT, -- fk
 is_active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE student_avatar_items (
 student_id INT NOT NULL,
 item_id INT NOT NULL,
 unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 equipped BOOLEAN NOT NULL DEFAULT FALSE,
 PRIMARY KEY (student_id, item_id)
);
 /*
NOTE YENYEN: 
One student can have many items.
One item can belong to many students.
But the same student cannot have the same item duplicated.
KAYA NAKA COMPOSITE KEY KA REMEMBER 

 */

  -- 11.) Vector Memory Reference

 CREATE TABLE vector_records (
 vector_record_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 namespace TEXT NOT NULL,
 source_type TEXT NOT NULL,
 source_id INT NOT NULL,
 embedding_id TEXT NOT NULL,
 metadata_json JSONB,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

  -- 12.) Orchestration, Logs & Notifications

CREATE TABLE n8n_workflow_logs (
 workflow_log_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 session_id INT, -- fk, nullable if workflow is not tied to a learning session
 workflow_name TEXT NOT NULL,
 execution_id TEXT,
 status TEXT NOT NULL,
 input_payload_json JSONB,
 output_payload_json JSONB,
 error_message TEXT,
 started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 ended_at TIMESTAMPTZ
);

CREATE TABLE api_request_logs (
 api_log_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id INT, -- fk
 session_id INT, -- fk
 service_name TEXT NOT NULL,
 endpoint TEXT NOT NULL,
 request_method TEXT NOT NULL,
 status_code INT,
 latency_ms INT,
 error_message TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
 notification_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 recipient_user_id INT NOT NULL, -- fk
 student_id INT, -- fk, nullable because some notifications may be for teacher/admin only
 notification_type TEXT NOT NULL,
 title TEXT NOT NULL,
 message TEXT NOT NULL,
 is_read BOOLEAN NOT NULL DEFAULT FALSE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 read_at TIMESTAMPTZ
);

------ RELATIONSHIPS




 -- 1.) Orchestration, Logs & Notifications

 ALTER TABLE users
 ADD CONSTRAINT fk_users_role_id_roles_roles_id
 FOREIGN KEY (role_id)
 REFERENCES roles(role_id);
 
 ALTER TABLE student_profiles
 ADD CONSTRAINT fk_student_profiles_section_id_class_section_section_id
 FOREIGN KEY (section_id)
 REFERENCES class_sections(section_id);

 ALTER TABLE parent_profiles
 ADD CONSTRAINT fk_parent_profiles_role_id_role_role_id
 FOREIGN KEY (role_id)
 REFERENCES roles(role_id);

ALTER TABLE student_parent_links
ADD CONSTRAINT fk_student_parent_links_student_id_student_profiles_student_id
FOREIGN KEY (student_id)
REFERENCES student_profiles(student_id),

ADD CONSTRAINT fk_student_parent_links_parent_id_parent_profiles_parent_id
FOREIGN KEY(parent_id)
REFERENCES parent_profiles(parent_id);


 -- 2.) Curriculum -> Tutoring session -> multimodal capture

 ALTER TABLE math_skills
 ADD CONSTRAINT fk_math_skills_topic_id_math_topics_topic_id
 FOREIGN KEY (topic_id)
 REFERENCES math_topics(topic_id);
 
 ALTER TABLE math_problems
 ADD CONSTRAINT fk_math_problems_difficulty_id_difficulty_levels_difficulty_id
 FOREIGN KEY (difficulty_id)
 REFERENCES difficulty_levels(difficulty_id),

 ADD CONSTRAINT fk_math_problems_skill_id_math_skills_skill_id
 FOREIGN KEY (skill_id)
 REFERENCES math_skill(skill_id);

 ALTER TABLE ai_sessions
 ADD CONSTRAINT fk_ai_sessions_problem_id_math_problems_problem_id
 FOREIGN KEY (problem_id)
 REFERENCES math_problems(problem_id);

 ALTER TABLE file_assets
 ADD CONSTRAINT fk_file_assets_owner_user_id_users_user_id
 FOREIGN KEY (owner_user_id)
 REFERENCES users(user_id);

 ALTER TABLE student_inputs
 ADD CONSTRAINT fk_student_inputs_raw_file_id_file_assets_file_id
 FOREIGN KEY (raw_file_id)
 REFERENCES file_assets(file_id);

 ALTER TABLE ocr_logs
 ADD CONSTRAINT fk_ocer_logs_input_id_student_inputs_input_id
 FOREIGN KEY (input_id)
 REFERENCES student_inputs(input_id);

 ALTER TABLE speech_to_text_logs
 ADD CONSTRAINT fk_speech_to_text_logs_input_id_student_inputs_input_id
 FOREIGN KEY (input_id)
 REFERENCES student_inputs(input_id);


 -- 3.) Conversation, state and guardrails

 ALTER TABLE ai_messages
 ADD CONSTRAINT fk_ai_messages_session_id_ai_sessions_session_id
 FOREIGN KEY (session_id)
 REFERENCES ai_sessions(session_id);

 ALTER TABLE guardrail_checks
 ADD CONSTRAINT fk_guardrail_checks_message_id_ai_messages_message_id
 FOREIGN KEY (message_id)
 REFERENCES ai_messages(message_id);

 ALTER TABLE session_states
 ADD CONSTRAINT fk_session_states_session_id_ai_sessions_session_id
 FOREIGN KEY (session_id)
 REFERENCES ai_sessions(session_id);

 ALTER TABLE text_to_speech_logs
 ADD CONSTRAINT fk_text_to_speech_logs_message_id_ai_messages_message_id
 FOREIGN KEY (message_id)
 REFERENCES ai_messages(message_id),

 ADD CONSTRAINT fk_text_to_speech_logs_generated_audio_file_id_file_assets_file_id
 FOREIGN KEY (generated_audio_file_id)
 REFERENCES file_assets(file_id);

 ALTER TABLE system_prompts
 ADD CONSTRAINT fk_system_prompts_created_by_user_id_users_user_id
 FOREIGN KEY (created_by_user_id)
 REFERENCES users(user_id);

 ALTER TABLE prompt_usage_logs
 ADD CONSTRAINT fk_prompt_usage_logs_prompt_id_system_prompts_prompt_id
 FOREIGN KEY (prompt_id)
 REFERENCES system_prompts(prompt_id),

 ADD CONSTRAINT fk_prompt_usage_logs_session_id_ai_sessions_session_id
 FOREIGN KEY (session_id)
 REFERENCES ai_sessions(session_id);


  -- 4.) Attempts -> Adaptive learning -> feautures -> predictions -> recommendations

ALTER TABLE student_attempts
ADD CONSTRAINT fk_student_attempts_session_id_ai_sessions_session_id
FOREIGN KEY (session_id)
REFERENCES ai_sessions(session_id),

ADD CONSTRAINT fk_student_attempts_student_id_student_profiles_student_id
FOREIGN KEY (student_id)
REFERENCES student_profiles(student_id),

ADD CONSTRAINT fk_student_attempts_problem_id_math_problems_problem_id
FOREIGN KEY (problem_id)
REFERENCES math_problems(problem_id);

ALTER TABLE attempt_steps
ADD CONSTRAINT fk_attempt_steps_attempt_id_student_attempts_attempt_id
FOREIGN KEY (attempt_id)
REFERENCES student_attempts(attempt_id);

ALTER TABLE student_skill_predictions
ADD CONSTRAINT fk_student_skill_predictions_student_id_student_profiles_student_id
FOREIGN KEY (student_id)
REFERENCES student_profiles(student_id),

ADD CONSTRAINT fk_student_skill_predictions_skill_id_math_skills_skill_id
FOREIGN KEY (skill_id)
REFERENCES math_skills(skill_id),

ADD CONSTRAINT fk_student_skill_predictions_model_version_id_ml_models_model_version_id
FOREIGN KEY (model_version_id)
REFERENCES ml_models(model_version_id),

ADD CONSTRAINT fk_student_skill_predictions_recommended_difficulty_id_difficulty_levels_difficulty_id
FOREIGN KEY (recommended_difficulty_id)
REFERENCES difficulty_levels(difficulty_id);

ALTER TABLE dda_events
ADD CONSTRAINT fk_dda_events_new_difficulty_id_difficulty_levels_difficulty_id
FOREIGN KEY (new_difficulty_id)
REFERENCES difficulty_levels(difficulty_id),

ADD CONSTRAINT fk_dda_events_session_id_ai_sessions_session_id
FOREIGN KEY (session_id)
REFERENCES ai_sessions(session_id),

ADD CONSTRAINT fk_dda_events_skill_id_math_skills_skill_id
FOREIGN KEY (skill_id)
REFERENCES math_skills(skill_id);

ALTER TABLE show_me_breakdowns
ADD CONSTRAINT fk_show_me_breakdowns_session_id_ai_sessions_session_id
FOREIGN KEY (session_id)
REFERENCES ai_sessions(session_id),

ADD CONSTRAINT fk_show_me_breakdowns_skill_id_math_skills_skill_id
FOREIGN KEY (skill_id)
REFERENCES math_skills(skill_id);

ALTER TABLE student_help_events
ADD CONSTRAINT student_help_events_session_id_ai_sessions_session_id
FOREIGN KEY (session_id)
REFERENCES ai_sessions(session_id),

ADD CONSTRAINT student_help_events_student_id_student_profiles_student_id
FOREIGN KEY (student_id)
REFERENCES student_profiles(student_id),

ADD CONSTRAINT student_help_events_message_id_ai_messages_message_id
FOREIGN KEY (message_id)
REFERENCES ai_messages(message_id),

ADD CONSTRAINT student_help_events_problem_id_math_problems_problem_id
FOREIGN KEY (problem_id)
REFERENCES math_problems(problem_id),

ADD CONSTRAINT student_help_events_skill_id_math_skills_skill_id
FOREIGN KEY (skill_id)
REFERENCES math_skills(skill_id);













 