-- Write section
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

CREATE TABLE teacher_profiles
(
 teacher_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id INT NOT NULL, -- fk
 employee_number VARCHAR(50) UNIQUE,
 specialization TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
 user_id INT NOT NULL UNIQUE,
 section_id INT, --fk
 grade_level SMALLINT,
 interests TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
 avatar_id INT, -- fk
 total_star_points DOUBLE PRECISION,
 current_streak INT,
 learning_status TEXT NOT NULL DEFAULT 'not_assessed',
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 interests TEXT[],
 first_name TEXT,
 last_name TEXT,
 birthdate TEXT
);

CREATE TABLE parent_profiles
(
 parent_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id INT, --fk
 contact_number SMALLINT,
 preferred_notification_channel TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 first_name TEXT,
 last_name TEXT,
 relationship TEXT,
 notification_channels TEXT[],
 issetup_complete BOOLEAN
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

 CREATE TABLE student_teacher_links
(
 student_teacher_link_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 student_id INT NOT NULL, -- fk
 teacher_id INT NOT NULL, -- fk
 section_id INT, -- fk; optional, identifies the class assignment
 assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 is_active BOOLEAN NOT NULL DEFAULT TRUE,

 UNIQUE (student_id, teacher_id, section_id)
);

 -- 1.1) Organization, Subscription, and Sales

CREATE TABLE organizations
(
 organization_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 organization_name VARCHAR(255) NOT NULL,
 organization_type TEXT NOT NULL DEFAULT 'school',
 contact_email TEXT,
 organization_status TEXT NOT NULL DEFAULT 'active',
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

 CONSTRAINT ck_organizations_type
 CHECK (organization_type IN ('school', 'enterprise')),

 CONSTRAINT ck_organizations_status
 CHECK (organization_status IN ('active', 'inactive'))
);


-- Connects teachers to the school/enterprise they belong to.
CREATE TABLE organization_members
(
 organization_member_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 organization_id INT NOT NULL, -- fk
 teacher_id INT NOT NULL, -- fk
 membership_role TEXT NOT NULL DEFAULT 'teacher',
 is_active BOOLEAN NOT NULL DEFAULT TRUE,
 joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 left_at TIMESTAMPTZ,

 UNIQUE (organization_id, teacher_id),

 CONSTRAINT ck_organization_members_role
 CHECK (membership_role IN ('owner', 'admin', 'teacher')),

 CONSTRAINT ck_organization_members_dates
 CHECK (left_at IS NULL OR left_at >= joined_at)
);


-- Connects students to a school independently from their current class.
CREATE TABLE organization_student_enrollments
(
 organization_student_enrollment_id INT
 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

 organization_id INT NOT NULL, -- fk
 student_id INT NOT NULL, -- fk
 enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 left_at TIMESTAMPTZ,
 is_active BOOLEAN NOT NULL DEFAULT TRUE,

 UNIQUE (organization_id, student_id),

 CONSTRAINT ck_organization_student_enrollment_dates
 CHECK (left_at IS NULL OR left_at >= enrolled_at)
);


-- Defines Starter, Semester, Lifetime, and Enterprise products.
CREATE TABLE subscription_plans
(
 plan_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 plan_code VARCHAR(50) NOT NULL UNIQUE,
 plan_name VARCHAR(100) NOT NULL,
 coverage_type TEXT NOT NULL,
 billing_model TEXT NOT NULL,
 price_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
 currency_code CHAR(3) NOT NULL DEFAULT 'PHP',
 access_duration_months INT,
 is_lifetime BOOLEAN NOT NULL DEFAULT FALSE,
 default_seat_limit INT,
 is_active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

 CONSTRAINT ck_subscription_plans_coverage
 CHECK (coverage_type IN ('individual', 'enterprise')),

 CONSTRAINT ck_subscription_plans_billing_model
 CHECK (billing_model IN ('free', 'one_time', 'contract')),

 CONSTRAINT ck_subscription_plans_price
 CHECK (price_amount >= 0),

 CONSTRAINT ck_subscription_plans_duration
 CHECK
 (
     access_duration_months IS NULL
     OR access_duration_months > 0
 ),

 CONSTRAINT ck_subscription_plans_lifetime_duration
 CHECK
 (
     is_lifetime IS FALSE
     OR access_duration_months IS NULL
 ),

 CONSTRAINT ck_subscription_plans_seat_limit
 CHECK
 (
     default_seat_limit IS NULL
     OR default_seat_limit > 0
 )
);


-- The payer is either an individual user or an organization.
-- A user may be a parent or a self-paying student.
CREATE TABLE billing_accounts
(
 billing_account_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id INT, -- fk; parent or self-paying learner
 organization_id INT, -- fk; school/enterprise payer
 billing_email TEXT NOT NULL,
 provider_customer_reference TEXT UNIQUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

 UNIQUE (user_id),
 UNIQUE (organization_id),

 CONSTRAINT ck_billing_accounts_exactly_one_owner
 CHECK
 (
     (user_id IS NOT NULL AND organization_id IS NULL)
     OR
     (user_id IS NULL AND organization_id IS NOT NULL)
 )
);


-- Stores the purchased access period.
-- It may represent free, semester, lifetime, or Enterprise access.
CREATE TABLE subscriptions
(
 subscription_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 billing_account_id INT NOT NULL, -- fk
 plan_id INT NOT NULL, -- fk
 provider_subscription_reference TEXT UNIQUE,
 subscription_status TEXT NOT NULL DEFAULT 'pending',
 purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 access_starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 access_ends_at TIMESTAMPTZ,
 is_lifetime BOOLEAN NOT NULL DEFAULT FALSE,
 auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
 seat_limit INT,
 cancelled_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

 CONSTRAINT ck_subscriptions_status
 CHECK
 (
     subscription_status IN
     ('pending', 'active', 'expired', 'cancelled', 'refunded')
 ),

 CONSTRAINT ck_subscriptions_access_period
 CHECK
 (
     (
         is_lifetime IS TRUE
         AND access_ends_at IS NULL
     )
     OR
     (
         is_lifetime IS FALSE
         AND access_ends_at IS NOT NULL
         AND access_ends_at > access_starts_at
     )
 ),

 CONSTRAINT ck_subscriptions_no_automatic_renewal
 CHECK (auto_renew IS FALSE),

 CONSTRAINT ck_subscriptions_seat_limit
 CHECK (seat_limit IS NULL OR seat_limit > 0)
);


-- Identifies which learner receives an individual subscription.
-- The payer and learner do not have to be the same person.
CREATE TABLE subscription_students
(
 subscription_student_id INT
 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

 subscription_id INT NOT NULL, -- fk
 student_id INT NOT NULL, -- fk
 assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 removed_at TIMESTAMPTZ,
 is_active BOOLEAN NOT NULL DEFAULT TRUE,

 UNIQUE (subscription_id, student_id),

 CONSTRAINT ck_subscription_students_dates
 CHECK (removed_at IS NULL OR removed_at >= assigned_at)
);


-- Stores successful, pending, failed, or refunded payments.
CREATE TABLE payment_transactions
(
 payment_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 subscription_id INT NOT NULL, -- fk
 provider_payment_reference TEXT UNIQUE,
 amount NUMERIC(12, 2) NOT NULL,
 currency_code CHAR(3) NOT NULL DEFAULT 'PHP',
 payment_status TEXT NOT NULL DEFAULT 'pending',
 paid_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

 CONSTRAINT ck_payment_transactions_amount
 CHECK (amount >= 0),

 CONSTRAINT ck_payment_transactions_status
 CHECK
 (
     payment_status IN ('pending', 'paid', 'failed', 'refunded')
 )
);

-- 1.2) Student QR and One-Time PIN Authentication

CREATE TABLE student_login_challenges
(
 challenge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

 student_id INT NOT NULL, -- fk; student who will log in

 issued_by_parent_id INT, -- fk; populated for parent QR
 issued_by_teacher_id INT, -- fk; populated for teacher PIN

 challenge_type TEXT NOT NULL,

 public_code VARCHAR(20),
 secret_hash TEXT NOT NULL,

 expires_at TIMESTAMPTZ NOT NULL,
 used_at TIMESTAMPTZ,
 revoked_at TIMESTAMPTZ,

 failed_attempt_count INT NOT NULL DEFAULT 0,
 maximum_attempt_count INT NOT NULL DEFAULT 5,

 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

 UNIQUE (public_code),

 CONSTRAINT ck_student_login_challenges_issuer
 CHECK
 (
     (
         challenge_type = 'parent_qr'
         AND issued_by_parent_id IS NOT NULL
         AND issued_by_teacher_id IS NULL
     )
     OR
     (
         challenge_type = 'teacher_pin'
         AND issued_by_parent_id IS NULL
         AND issued_by_teacher_id IS NOT NULL
     )
 ),

 CONSTRAINT ck_student_login_challenges_expiry
 CHECK (expires_at > created_at),

 CONSTRAINT ck_student_login_challenges_attempts
 CHECK
 (
     failed_attempt_count >= 0
     AND maximum_attempt_count > 0
 )
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
 student_id INT,
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
 ADD CONSTRAINT fk_student_profiles_user_id_users_user_id
 FOREIGN KEY (user_id)
 REFERENCES users(user_id);
 
 ALTER TABLE student_profiles
 ADD CONSTRAINT fk_student_profiles_section_id_class_section_section_id
 FOREIGN KEY (section_id)
 REFERENCES class_sections(section_id);

 ALTER TABLE parent_profiles
 ADD CONSTRAINT fk_parent_profiles_user_id_users_user_id
 FOREIGN KEY (user_id)
 REFERENCES users(user_id);

ALTER TABLE student_parent_links
ADD CONSTRAINT fk_student_parent_links_student_id_student_profiles_student_id
FOREIGN KEY (student_id)
REFERENCES student_profiles(student_id),

ADD CONSTRAINT fk_student_parent_links_parent_id_parent_profiles_parent_id
FOREIGN KEY(parent_id)
REFERENCES parent_profiles(parent_id);

ALTER TABLE teacher_profiles
ADD CONSTRAINT fk_teacher_profiles_user_id_users_user_id
FOREIGN KEY (user_id)
REFERENCES users(user_id);

ALTER TABLE class_sections
ADD CONSTRAINT fk_class_sections_teacher_id_teacher_profiles_teacher_id
FOREIGN KEY (teacher_id)
REFERENCES teacher_profiles(teacher_id),

ADD COLUMN organization_id INT,
ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE student_teacher_links
ADD CONSTRAINT fk_student_teacher_links_student_id_student_profiles_student_id
FOREIGN KEY (student_id)
REFERENCES student_profiles(student_id),

ADD CONSTRAINT fk_student_teacher_links_teacher_id_teacher_profiles_teacher_id
FOREIGN KEY (teacher_id)
REFERENCES teacher_profiles(teacher_id),

ADD CONSTRAINT fk_student_teacher_links_section_id_class_sections_section_id
FOREIGN KEY (section_id)
REFERENCES class_sections(section_id);

-- 1.1) Organization, Subscription, and Sales Relationships

ALTER TABLE organization_members
ADD CONSTRAINT fk_organization_members_organization_id_organizations
FOREIGN KEY (organization_id)
REFERENCES organizations(organization_id),

ADD CONSTRAINT fk_organization_members_teacher_id_teacher_profiles
FOREIGN KEY (teacher_id)
REFERENCES teacher_profiles(teacher_id);


ALTER TABLE organization_student_enrollments
ADD CONSTRAINT fk_organization_student_enrollments_organization_id_organizations
FOREIGN KEY (organization_id)
REFERENCES organizations(organization_id),

ADD CONSTRAINT fk_organization_student_enrollments_student_id_student_profiles
FOREIGN KEY (student_id)
REFERENCES student_profiles(student_id);


ALTER TABLE class_sections
ADD CONSTRAINT fk_class_sections_organization_id_organizations
FOREIGN KEY (organization_id)
REFERENCES organizations(organization_id),

ADD CONSTRAINT fk_class_sections_organization_teacher_membership
FOREIGN KEY (organization_id, teacher_id)
REFERENCES organization_members(organization_id, teacher_id);


ALTER TABLE billing_accounts
ADD CONSTRAINT fk_billing_accounts_user_id_users
FOREIGN KEY (user_id)
REFERENCES users(user_id),

ADD CONSTRAINT fk_billing_accounts_organization_id_organizations
FOREIGN KEY (organization_id)
REFERENCES organizations(organization_id);


ALTER TABLE subscriptions
ADD CONSTRAINT fk_subscriptions_billing_account_id_billing_accounts
FOREIGN KEY (billing_account_id)
REFERENCES billing_accounts(billing_account_id),

ADD CONSTRAINT fk_subscriptions_plan_id_subscription_plans
FOREIGN KEY (plan_id)
REFERENCES subscription_plans(plan_id);


ALTER TABLE subscription_students
ADD CONSTRAINT fk_subscription_students_subscription_id_subscriptions
FOREIGN KEY (subscription_id)
REFERENCES subscriptions(subscription_id),

ADD CONSTRAINT fk_subscription_students_student_id_student_profiles
FOREIGN KEY (student_id)
REFERENCES student_profiles(student_id);


ALTER TABLE payment_transactions
ADD CONSTRAINT fk_payment_transactions_subscription_id_subscriptions
FOREIGN KEY (subscription_id)
REFERENCES subscriptions(subscription_id);

-- 1.2) Student QR and One-Time PIN Authentication Relationships

ALTER TABLE student_login_challenges
ADD CONSTRAINT fk_student_login_challenges_student_id_student_profiles
FOREIGN KEY (student_id)
REFERENCES student_profiles(student_id),

ADD CONSTRAINT fk_student_login_challenges_parent_id_parent_profiles
FOREIGN KEY (issued_by_parent_id)
REFERENCES parent_profiles(parent_id),

ADD CONSTRAINT fk_student_login_challenges_teacher_id_teacher_profiles
FOREIGN KEY (issued_by_teacher_id)
REFERENCES teacher_profiles(teacher_id);

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
 REFERENCES math_skills(skill_id);

 ALTER TABLE ai_sessions
 ADD CONSTRAINT fk_ai_sessions_problem_id_math_problems_problem_id
 FOREIGN KEY (problem_id)
 REFERENCES math_problems(problem_id),

ADD CONSTRAINT fk_ai_sessions_student_id_student_profiles_student_id
FOREIGN KEY (student_id)
REFERENCES public.student_profiles(student_id)
ON DELETE RESTRICT,

ADD CONSTRAINT uq_ai_sessions_session_student
UNIQUE (session_id, student_id);

 ALTER TABLE file_assets
 ADD CONSTRAINT fk_file_assets_owner_user_id_users_user_id
 FOREIGN KEY (owner_user_id)
 REFERENCES users(user_id);

 ALTER TABLE student_inputs
 ADD CONSTRAINT fk_student_inputs_raw_file_id_file_assets_file_id
 FOREIGN KEY (raw_file_id)
 REFERENCES file_assets(file_id),

 ADD CONSTRAINT fk_student_inputs_student
 FOREIGN KEY (student_id)
 REFERENCES public.student_profiles(student_id),

 ADD CONSTRAINT fk_student_inputs_session_student
 FOREIGN KEY (session_id, student_id)
 REFERENCES public.ai_sessions(session_id, student_id);

 

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

ALTER TABLE student_skill_features
ADD CONSTRAINT fk_student_skill_features_student_id_student_profiles_student_id
FOREIGN KEY (student_id)
REFERENCES student_profiles(student_id),

ADD CONSTRAINT fk_student_skill_features_skill_id_math_skills_skill_id
FOREIGN KEY (skill_id)
REFERENCES math_skills(skill_id);

ALTER TABLE learning_recommendations
ADD CONSTRAINT fk_learning_recommendations_prediction_id_student_skill_predictions_prediction_id
FOREIGN KEY (prediction_id)
REFERENCES student_skill_predictions(prediction_id);



  -- 5.) Engagement, orchestration and output

ALTER TABLE reward_transactions
ADD CONSTRAINT fk_reward_transactions_student_id_student_profiles_student_id
FOREIGN KEY (student_id)
REFERENCES student_profiles(student_id),

ADD CONSTRAINT fk_reward_transactions_session_id_ai_sessions_session_id
FOREIGN KEY (session_id)
REFERENCES ai_sessions(session_id);

ALTER TABLE avatars
ADD CONSTRAINT fk_avatars_default_asset_file_id_file_assets_file_id
FOREIGN KEY (default_asset_file_id)
REFERENCES file_assets(file_id);

ALTER TABLE student_profiles
ADD CONSTRAINT fk_student_profiles_avatar_id_avatars_avatar_id
FOREIGN KEY (avatar_id)
REFERENCES avatars(avatar_id);

ALTER TABLE avatar_items
ADD CONSTRAINT fk_avatar_items_asset_file_id_file_assets_file_id
FOREIGN KEY (asset_file_id)
REFERENCES file_assets(file_id);

ALTER TABLE student_avatar_items
ADD CONSTRAINT fk_student_avatar_items_item_id_avatar_items_item_id
FOREIGN KEY (item_id)
REFERENCES avatar_items(item_id),

ADD CONSTRAINT fk_student_avatar_items_student_id_student_profiles_student_id
FOREIGN KEY (student_id)
REFERENCES student_profiles(student_id);

ALTER TABLE n8n_workflow_logs
ADD CONSTRAINT fk_n8n_workflow_logs_session_id_ai_sessions_session_id
FOREIGN KEY (session_id)
REFERENCES ai_sessions(session_id);

ALTER TABLE api_request_logs
ADD CONSTRAINT fk_api_request_logs_user_id_users_user_id
FOREIGN KEY (user_id)
REFERENCES users(user_id),

ADD CONSTRAINT fk_api_request_logs_session_id_ai_sessions_session_id
FOREIGN KEY (session_id)
REFERENCES ai_sessions(session_id);

ALTER TABLE notifications
ADD CONSTRAINT fk_notifications_recipient_user_id_users_user_id
FOREIGN KEY (recipient_user_id)
REFERENCES users(user_id),

ADD CONSTRAINT fk_notifications_student_id_student_profiles_student_id
FOREIGN KEY (student_id)
REFERENCES student_profiles(student_id);