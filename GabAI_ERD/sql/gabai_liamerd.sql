-- GabAI PostgreSQL write model for LiamERD
-- Target: PostgreSQL / Supabase
-- Scope: relational schema only; no RLS, triggers, procedures, or read views.
--
-- Supabase Auth integration boundary:
-- application_users.auth_user_id stores auth.users.id. The FK to auth.users is
-- intentionally omitted so this file remains self-contained for LiamERD import.
--
-- Long constraint names use deterministic abbreviations such as app, cls, act,
-- ver, diff, att, and pred to remain below PostgreSQL's 63-byte identifier limit.

-- ============================================================================
-- PART 1 - TABLES
-- ============================================================================

-- 1. IDENTITY

CREATE TABLE institutions (
    institution_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institution_code TEXT NOT NULL,
    institution_name TEXT NOT NULL,
    timezone_name TEXT NOT NULL DEFAULT 'Asia/Manila',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_institutions_institution_code UNIQUE (institution_code),
    CONSTRAINT ck_institutions_code_not_blank
        CHECK (BTRIM(institution_code) <> ''),
    CONSTRAINT ck_institutions_name_not_blank
        CHECK (BTRIM(institution_name) <> '')
);

CREATE TABLE application_users (
    user_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    auth_user_id UUID NOT NULL,
    display_name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_application_users_auth_user_id UNIQUE (auth_user_id),
    CONSTRAINT ck_application_users_display_name_not_blank
        CHECK (BTRIM(display_name) <> '')
);

CREATE TABLE institution_memberships (
    institution_membership_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institution_id INT NOT NULL,
    user_id INT NOT NULL,
    membership_role TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMPTZ,
    CONSTRAINT uq_institution_memberships_user_institution
        UNIQUE (user_id, institution_id),
    CONSTRAINT uq_institution_memberships_user_tenant_role
        UNIQUE (user_id, institution_id, membership_role),
    CONSTRAINT uq_institution_memberships_id_institution
        UNIQUE (institution_membership_id, institution_id),
    CONSTRAINT ck_institution_memberships_role
        CHECK (membership_role IN ('student', 'teacher')),
    CONSTRAINT ck_institution_memberships_time_range
        CHECK (ended_at IS NULL OR ended_at >= joined_at),
    CONSTRAINT ck_institution_memberships_active_end
        CHECK (is_active = TRUE OR ended_at IS NOT NULL)
);

CREATE TABLE user_preferences (
    user_id INT PRIMARY KEY,
    preferred_language_code TEXT NOT NULL DEFAULT 'en',
    timezone_name TEXT NOT NULL DEFAULT 'Asia/Manila',
    text_scale NUMERIC(3,2) NOT NULL DEFAULT 1.00,
    is_high_contrast BOOLEAN NOT NULL DEFAULT FALSE,
    is_reduced_motion BOOLEAN NOT NULL DEFAULT FALSE,
    prefers_text_response BOOLEAN NOT NULL DEFAULT FALSE,
    allow_ai_personal_preferences BOOLEAN NOT NULL DEFAULT FALSE,
    notification_delivery TEXT NOT NULL DEFAULT 'immediate',
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_user_preferences_language_not_blank
        CHECK (BTRIM(preferred_language_code) <> ''),
    CONSTRAINT ck_user_preferences_text_scale
        CHECK (text_scale BETWEEN 0.75 AND 2.00),
    CONSTRAINT ck_user_preferences_notification_delivery
        CHECK (notification_delivery IN ('immediate', 'digest', 'muted')),
    CONSTRAINT ck_user_preferences_quiet_hours_pair
        CHECK (
            (quiet_hours_start IS NULL AND quiet_hours_end IS NULL)
            OR
            (quiet_hours_start IS NOT NULL AND quiet_hours_end IS NOT NULL)
        )
);

CREATE TABLE student_profiles (
    student_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INT NOT NULL,
    institution_id INT NOT NULL,
    profile_role TEXT NOT NULL DEFAULT 'student',
    student_number TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_student_profiles_user_id UNIQUE (user_id),
    CONSTRAINT uq_student_profiles_institution_number
        UNIQUE (institution_id, student_number),
    CONSTRAINT uq_student_profiles_student_institution
        UNIQUE (student_id, institution_id),
    CONSTRAINT ck_student_profiles_number_not_blank
        CHECK (BTRIM(student_number) <> ''),
    CONSTRAINT ck_student_profiles_role CHECK (profile_role = 'student')
);

CREATE TABLE teacher_profiles (
    teacher_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INT NOT NULL,
    institution_id INT NOT NULL,
    profile_role TEXT NOT NULL DEFAULT 'teacher',
    employee_number TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_teacher_profiles_user_id UNIQUE (user_id),
    CONSTRAINT uq_teacher_profiles_institution_number
        UNIQUE (institution_id, employee_number),
    CONSTRAINT uq_teacher_profiles_teacher_institution
        UNIQUE (teacher_id, institution_id),
    CONSTRAINT ck_teacher_profiles_number_not_blank
        CHECK (BTRIM(employee_number) <> ''),
    CONSTRAINT ck_teacher_profiles_role CHECK (profile_role = 'teacher')
);

-- 2. INSTITUTION / ACADEMIC STRUCTURE

CREATE TABLE academic_terms (
    academic_term_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institution_id INT NOT NULL,
    term_code TEXT NOT NULL,
    term_name TEXT NOT NULL,
    starts_on DATE NOT NULL,
    ends_on DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_academic_terms_institution_code
        UNIQUE (institution_id, term_code),
    CONSTRAINT uq_academic_terms_term_institution
        UNIQUE (academic_term_id, institution_id),
    CONSTRAINT ck_academic_terms_date_range CHECK (ends_on >= starts_on)
);

CREATE TABLE subjects (
    subject_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institution_id INT NOT NULL,
    subject_code TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_subjects_institution_code
        UNIQUE (institution_id, subject_code),
    CONSTRAINT uq_subjects_subject_institution
        UNIQUE (subject_id, institution_id),
    CONSTRAINT ck_subjects_code_not_blank CHECK (BTRIM(subject_code) <> ''),
    CONSTRAINT ck_subjects_name_not_blank CHECK (BTRIM(subject_name) <> '')
);

CREATE TABLE class_offerings (
    class_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institution_id INT NOT NULL,
    subject_id INT NOT NULL,
    academic_term_id INT NOT NULL,
    class_code TEXT NOT NULL,
    class_name TEXT NOT NULL,
    enrollment_status TEXT NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_class_offerings_term_code
        UNIQUE (institution_id, academic_term_id, class_code),
    CONSTRAINT uq_class_offerings_class_institution
        UNIQUE (class_id, institution_id),
    CONSTRAINT ck_class_offerings_code_not_blank
        CHECK (BTRIM(class_code) <> ''),
    CONSTRAINT ck_class_offerings_name_not_blank
        CHECK (BTRIM(class_name) <> ''),
    CONSTRAINT ck_class_offerings_enrollment_status
        CHECK (enrollment_status IN ('open', 'closed', 'archived'))
);

CREATE TABLE class_meeting_patterns (
    class_meeting_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    class_id INT NOT NULL,
    institution_id INT NOT NULL,
    weekday_number SMALLINT NOT NULL,
    starts_at TIME NOT NULL,
    ends_at TIME NOT NULL,
    location_name TEXT,
    valid_from DATE,
    valid_until DATE,
    CONSTRAINT ck_class_meeting_patterns_weekday
        CHECK (weekday_number BETWEEN 1 AND 7),
    CONSTRAINT ck_class_meeting_patterns_time_range
        CHECK (ends_at > starts_at),
    CONSTRAINT ck_class_meeting_patterns_date_range
        CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until >= valid_from)
);

CREATE TABLE teacher_class_assignments (
    teacher_class_assignment_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    class_id INT NOT NULL,
    teacher_id INT NOT NULL,
    institution_id INT NOT NULL,
    assignment_role TEXT NOT NULL DEFAULT 'lead',
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMPTZ,
    CONSTRAINT uq_teacher_class_assignments_teacher_class
        UNIQUE (teacher_id, class_id),
    CONSTRAINT uq_teacher_class_assignments_tenant_pair
        UNIQUE (teacher_id, class_id, institution_id),
    CONSTRAINT ck_teacher_class_assignments_role
        CHECK (assignment_role IN ('lead', 'co_teacher', 'assistant')),
    CONSTRAINT ck_teacher_class_assignments_time_range
        CHECK (ended_at IS NULL OR ended_at >= assigned_at)
);

CREATE TABLE class_enrollments (
    class_enrollment_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    class_id INT NOT NULL,
    student_id INT NOT NULL,
    institution_id INT NOT NULL,
    enrollment_status TEXT NOT NULL DEFAULT 'active',
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMPTZ,
    CONSTRAINT uq_class_enrollments_student_class
        UNIQUE (student_id, class_id),
    CONSTRAINT ck_class_enrollments_status
        CHECK (enrollment_status IN ('active', 'completed', 'withdrawn')),
    CONSTRAINT ck_class_enrollments_time_range
        CHECK (ended_at IS NULL OR ended_at >= enrolled_at)
);

-- 3. LEARNING MATERIALS AND ACADEMIC ACTIVITIES

CREATE TABLE file_assets (
    file_asset_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institution_id INT NOT NULL,
    uploaded_by_user_id INT NOT NULL,
    storage_bucket TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    byte_size BIGINT NOT NULL,
    checksum_sha256 TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_file_assets_bucket_path
        UNIQUE (storage_bucket, storage_path),
    CONSTRAINT uq_file_assets_asset_institution
        UNIQUE (file_asset_id, institution_id),
    CONSTRAINT ck_file_assets_byte_size CHECK (byte_size >= 0),
    CONSTRAINT ck_file_assets_checksum_sha256
        CHECK (checksum_sha256 ~ '^[0-9A-Fa-f]{64}$')
);

CREATE TABLE learning_materials (
    learning_material_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institution_id INT NOT NULL,
    class_id INT NOT NULL,
    created_by_teacher_id INT NOT NULL,
    current_version_id INT,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_learning_materials_material_institution
        UNIQUE (learning_material_id, institution_id)
);

CREATE TABLE learning_material_versions (
    material_version_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    learning_material_id INT NOT NULL,
    institution_id INT NOT NULL,
    file_asset_id INT NOT NULL,
    version_number INT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    is_ai_use_allowed BOOLEAN NOT NULL DEFAULT TRUE,
    change_summary TEXT,
    created_by_teacher_id INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_learning_material_versions_number
        UNIQUE (learning_material_id, version_number),
    CONSTRAINT uq_learning_material_versions_pair
        UNIQUE (material_version_id, learning_material_id),
    CONSTRAINT uq_learning_material_versions_tenant_pair
        UNIQUE (material_version_id, institution_id),
    CONSTRAINT ck_learning_material_versions_number
        CHECK (version_number > 0),
    CONSTRAINT ck_learning_material_versions_title_not_blank
        CHECK (BTRIM(title) <> '')
);

CREATE TABLE activity_types (
    activity_type_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institution_id INT NOT NULL,
    type_code TEXT NOT NULL,
    type_label TEXT NOT NULL,
    description TEXT,
    is_assessment BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_activity_types_institution_code
        UNIQUE (institution_id, type_code),
    CONSTRAINT uq_activity_types_type_institution
        UNIQUE (activity_type_id, institution_id),
    CONSTRAINT ck_activity_types_code_format
        CHECK (type_code ~ '^[a-z][a-z0-9_]*$'),
    CONSTRAINT ck_activity_types_label_not_blank
        CHECK (BTRIM(type_label) <> '')
);

CREATE TABLE academic_activities (
    activity_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institution_id INT NOT NULL,
    class_id INT NOT NULL,
    activity_type_id INT NOT NULL,
    created_by_teacher_id INT NOT NULL,
    current_version_id INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_academic_activities_activity_institution
        UNIQUE (activity_id, institution_id)
);

CREATE TABLE academic_activity_versions (
    activity_version_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    activity_id INT NOT NULL,
    institution_id INT NOT NULL,
    version_number INT NOT NULL,
    title TEXT NOT NULL,
    instructions TEXT NOT NULL,
    due_at TIMESTAMPTZ,
    teacher_estimated_minutes INT,
    publication_status TEXT NOT NULL DEFAULT 'draft',
    change_summary TEXT,
    published_at TIMESTAMPTZ,
    created_by_teacher_id INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_academic_activity_versions_number
        UNIQUE (activity_id, version_number),
    CONSTRAINT uq_academic_activity_versions_pair
        UNIQUE (activity_version_id, activity_id),
    CONSTRAINT uq_academic_activity_versions_tenant_pair
        UNIQUE (activity_version_id, institution_id),
    CONSTRAINT ck_academic_activity_versions_number
        CHECK (version_number > 0),
    CONSTRAINT ck_academic_activity_versions_title_not_blank
        CHECK (BTRIM(title) <> ''),
    CONSTRAINT ck_academic_activity_versions_instructions_not_blank
        CHECK (BTRIM(instructions) <> ''),
    CONSTRAINT ck_academic_activity_versions_teacher_minutes
        CHECK (teacher_estimated_minutes IS NULL OR teacher_estimated_minutes > 0),
    CONSTRAINT ck_academic_activity_versions_status
        CHECK (publication_status IN ('draft', 'published', 'closed', 'archived')),
    CONSTRAINT ck_academic_activity_versions_published_at
        CHECK (
            publication_status = 'draft'
            OR published_at IS NOT NULL
        )
);

CREATE TABLE activity_materials (
    institution_id INT NOT NULL,
    activity_version_id INT NOT NULL,
    material_version_id INT NOT NULL,
    display_order INT NOT NULL DEFAULT 1,
    PRIMARY KEY (activity_version_id, material_version_id),
    CONSTRAINT ck_activity_materials_display_order CHECK (display_order > 0)
);

CREATE TABLE ai_model_versions (
    ai_model_version_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    provider_name TEXT NOT NULL,
    model_name TEXT NOT NULL,
    version_identifier TEXT NOT NULL,
    model_purpose TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    activated_at TIMESTAMPTZ,
    retired_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_ai_model_versions_identity
        UNIQUE (provider_name, model_name, version_identifier, model_purpose),
    CONSTRAINT ck_ai_model_versions_time_range
        CHECK (retired_at IS NULL OR activated_at IS NULL OR retired_at >= activated_at)
);

CREATE TABLE difficulty_rubrics (
    difficulty_rubric_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    rubric_code TEXT NOT NULL,
    version_number INT NOT NULL,
    rubric_name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_difficulty_rubrics_code_version
        UNIQUE (rubric_code, version_number),
    CONSTRAINT ck_difficulty_rubrics_version CHECK (version_number > 0)
);

CREATE TABLE difficulty_levels (
    difficulty_rubric_id INT NOT NULL,
    standardized_score SMALLINT NOT NULL,
    level_code TEXT NOT NULL,
    level_label TEXT NOT NULL,
    description TEXT NOT NULL,
    PRIMARY KEY (difficulty_rubric_id, standardized_score),
    CONSTRAINT uq_difficulty_levels_code
        UNIQUE (difficulty_rubric_id, level_code),
    CONSTRAINT ck_difficulty_levels_score
        CHECK (standardized_score BETWEEN 1 AND 5)
);

CREATE TABLE activity_difficulty_assessments (
    difficulty_assessment_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institution_id INT NOT NULL,
    activity_version_id INT NOT NULL,
    ai_model_version_id INT NOT NULL,
    difficulty_rubric_id INT NOT NULL,
    standardized_score SMALLINT NOT NULL,
    rationale TEXT,
    assessment_sequence INT NOT NULL,
    assessed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    superseded_at TIMESTAMPTZ,
    CONSTRAINT uq_activity_diff_assessments_sequence
        UNIQUE (activity_version_id, assessment_sequence),
    CONSTRAINT uq_activity_diff_assessments_tenant_pair
        UNIQUE (difficulty_assessment_id, institution_id),
    CONSTRAINT ck_activity_diff_assessments_score
        CHECK (standardized_score BETWEEN 1 AND 5),
    CONSTRAINT ck_activity_diff_assessments_sequence
        CHECK (assessment_sequence > 0),
    CONSTRAINT ck_activity_diff_assessments_time_range
        CHECK (superseded_at IS NULL OR superseded_at > assessed_at)
);

-- 4. STUDENT PLANNER AND STUDY SESSIONS

CREATE TABLE student_activity_states (
    student_activity_state_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institution_id INT NOT NULL,
    student_id INT NOT NULL,
    activity_id INT NOT NULL,
    last_seen_activity_version_id INT,
    completed_against_version_id INT,
    activity_status TEXT NOT NULL DEFAULT 'not_started',
    personal_priority SMALLINT,
    actual_completion_minutes INT,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_student_activity_states_student_activity
        UNIQUE (student_id, activity_id),
    CONSTRAINT ck_student_activity_states_status
        CHECK (activity_status IN ('not_started', 'in_progress', 'completed', 'skipped')),
    CONSTRAINT ck_student_activity_states_priority
        CHECK (personal_priority IS NULL OR personal_priority BETWEEN 1 AND 5),
    CONSTRAINT ck_student_activity_states_minutes
        CHECK (actual_completion_minutes IS NULL OR actual_completion_minutes >= 0),
    CONSTRAINT ck_student_activity_states_completion
        CHECK (
            activity_status <> 'completed'
            OR (completed_at IS NOT NULL AND completed_against_version_id IS NOT NULL)
        )
);

CREATE TABLE student_tasks (
    student_task_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institution_id INT NOT NULL,
    student_id INT NOT NULL,
    activity_id INT,
    parent_task_id BIGINT,
    task_kind TEXT NOT NULL,
    task_origin TEXT NOT NULL,
    title TEXT NOT NULL,
    details TEXT,
    due_at TIMESTAMPTZ,
    estimated_minutes INT,
    task_status TEXT NOT NULL DEFAULT 'pending',
    display_order INT NOT NULL DEFAULT 1,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_student_tasks_task_owner
        UNIQUE (student_task_id, student_id, institution_id),
    CONSTRAINT ck_student_tasks_kind
        CHECK (task_kind IN ('activity_milestone', 'personal')),
    CONSTRAINT ck_student_tasks_kind_source
        CHECK (
            (task_kind = 'activity_milestone' AND activity_id IS NOT NULL)
            OR
            (task_kind = 'personal' AND activity_id IS NULL)
        ),
    CONSTRAINT ck_student_tasks_origin
        CHECK (task_origin IN ('student', 'ai_generated', 'student_edited_ai')),
    CONSTRAINT ck_student_tasks_status
        CHECK (task_status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    CONSTRAINT ck_student_tasks_title_not_blank CHECK (BTRIM(title) <> ''),
    CONSTRAINT ck_student_tasks_estimated_minutes
        CHECK (estimated_minutes IS NULL OR estimated_minutes > 0),
    CONSTRAINT ck_student_tasks_display_order CHECK (display_order > 0),
    CONSTRAINT ck_student_tasks_completed_at
        CHECK (task_status <> 'completed' OR completed_at IS NOT NULL)
);

CREATE TABLE task_dependencies (
    institution_id INT NOT NULL,
    student_id INT NOT NULL,
    predecessor_task_id BIGINT NOT NULL,
    successor_task_id BIGINT NOT NULL,
    PRIMARY KEY (predecessor_task_id, successor_task_id),
    CONSTRAINT ck_task_dependencies_not_self
        CHECK (predecessor_task_id <> successor_task_id)
);

CREATE TABLE student_time_blocks (
    student_time_block_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institution_id INT NOT NULL,
    student_id INT NOT NULL,
    block_kind TEXT NOT NULL,
    title TEXT,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_student_time_blocks_kind
        CHECK (block_kind IN ('available', 'unavailable', 'preferred', 'commitment', 'quiet')),
    CONSTRAINT ck_student_time_blocks_time_range CHECK (ends_at > starts_at)
);

CREATE TABLE planner_recommendations (
    planner_recommendation_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institution_id INT NOT NULL,
    student_id INT NOT NULL,
    student_task_id BIGINT NOT NULL,
    ai_model_version_id INT NOT NULL,
    suggested_start_at TIMESTAMPTZ NOT NULL,
    suggested_minutes INT NOT NULL,
    reason_code TEXT NOT NULL,
    explanation TEXT NOT NULL,
    has_conflict BOOLEAN NOT NULL DEFAULT FALSE,
    recommendation_status TEXT NOT NULL DEFAULT 'proposed',
    generated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decided_at TIMESTAMPTZ,
    CONSTRAINT uq_planner_recommendations_owner
        UNIQUE (planner_recommendation_id, student_id, institution_id),
    CONSTRAINT uq_planner_recommendations_task_owner
        UNIQUE (planner_recommendation_id, student_task_id, student_id, institution_id),
    CONSTRAINT ck_planner_recommendations_minutes
        CHECK (suggested_minutes > 0),
    CONSTRAINT ck_planner_recommendations_reason
        CHECK (reason_code IN ('near_deadline', 'estimated_effort', 'workload_balance', 'preferred_time', 'schedule_conflict')),
    CONSTRAINT ck_planner_recommendations_status
        CHECK (recommendation_status IN ('proposed', 'accepted', 'edited', 'dismissed', 'superseded')),
    CONSTRAINT ck_planner_recommendations_decision
        CHECK (
            recommendation_status = 'proposed'
            OR decided_at IS NOT NULL
        )
);

CREATE TABLE planned_study_sessions (
    planned_session_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institution_id INT NOT NULL,
    student_id INT NOT NULL,
    student_task_id BIGINT NOT NULL,
    planner_recommendation_id BIGINT,
    replaces_planned_session_id BIGINT,
    scheduled_start_at TIMESTAMPTZ NOT NULL,
    planned_minutes INT NOT NULL,
    planning_source TEXT NOT NULL,
    session_status TEXT NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_planned_study_sessions_owner
        UNIQUE (planned_session_id, student_id, institution_id),
    CONSTRAINT uq_planned_study_sessions_task_owner
        UNIQUE (planned_session_id, student_task_id, student_id, institution_id),
    CONSTRAINT uq_planned_study_sessions_replaces
        UNIQUE (replaces_planned_session_id),
    CONSTRAINT ck_planned_study_sessions_minutes CHECK (planned_minutes > 0),
    CONSTRAINT ck_planned_study_sessions_source
        CHECK (planning_source IN ('student', 'ai_recommendation')),
    CONSTRAINT ck_planned_study_sessions_status
        CHECK (session_status IN ('scheduled', 'completed', 'cancelled', 'rescheduled', 'missed'))
);

CREATE TABLE study_sessions (
    study_session_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institution_id INT NOT NULL,
    student_id INT NOT NULL,
    student_task_id BIGINT NOT NULL,
    planned_session_id BIGINT,
    client_event_id UUID,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ NOT NULL,
    focused_minutes INT NOT NULL,
    outcome_status TEXT NOT NULL,
    reflection TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_study_sessions_client_event_id UNIQUE (client_event_id),
    CONSTRAINT ck_study_sessions_time_range CHECK (ended_at >= started_at),
    CONSTRAINT ck_study_sessions_focused_minutes CHECK (focused_minutes >= 0),
    CONSTRAINT ck_study_sessions_outcome
        CHECK (outcome_status IN ('completed', 'interrupted', 'abandoned'))
);

CREATE TABLE student_notes (
    student_note_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institution_id INT NOT NULL,
    student_id INT NOT NULL,
    activity_version_id INT,
    material_version_id INT,
    title TEXT NOT NULL,
    note_body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_student_notes_title_not_blank CHECK (BTRIM(title) <> ''),
    CONSTRAINT ck_student_notes_body_not_blank CHECK (BTRIM(note_body) <> '')
);

-- 5. ATTENDANCE

CREATE TABLE attendance_sessions (
    attendance_session_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institution_id INT NOT NULL,
    class_id INT NOT NULL,
    opened_by_teacher_id INT NOT NULL,
    session_title TEXT NOT NULL,
    opens_at TIMESTAMPTZ NOT NULL,
    closes_at TIMESTAMPTZ NOT NULL,
    session_status TEXT NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_attendance_sessions_session_institution
        UNIQUE (attendance_session_id, institution_id),
    CONSTRAINT ck_attendance_sessions_time_range CHECK (closes_at > opens_at),
    CONSTRAINT ck_attendance_sessions_status
        CHECK (session_status IN ('scheduled', 'open', 'closed', 'cancelled'))
);

CREATE TABLE attendance_tokens (
    attendance_token_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    attendance_session_id BIGINT NOT NULL,
    token_hash TEXT NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    CONSTRAINT uq_attendance_tokens_hash UNIQUE (token_hash),
    CONSTRAINT uq_attendance_tokens_token_session
        UNIQUE (attendance_token_id, attendance_session_id),
    CONSTRAINT ck_attendance_tokens_hash_not_blank CHECK (BTRIM(token_hash) <> ''),
    CONSTRAINT ck_attendance_tokens_time_range CHECK (expires_at > issued_at),
    CONSTRAINT ck_attendance_tokens_revocation
        CHECK (revoked_at IS NULL OR revoked_at >= issued_at)
);

CREATE TABLE attendance_scan_events (
    attendance_scan_event_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institution_id INT NOT NULL,
    attendance_session_id BIGINT NOT NULL,
    attendance_token_id BIGINT,
    student_id INT NOT NULL,
    client_event_id UUID NOT NULL,
    scan_source TEXT NOT NULL,
    scanned_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ,
    validation_status TEXT NOT NULL DEFAULT 'pending',
    validation_reason TEXT,
    validated_at TIMESTAMPTZ,
    CONSTRAINT uq_attendance_scan_events_client_event
        UNIQUE (student_id, client_event_id),
    CONSTRAINT ck_attendance_scan_events_source
        CHECK (scan_source IN ('online_qr', 'offline_qr', 'accessibility_alternative')),
    CONSTRAINT ck_attendance_scan_events_validation
        CHECK (validation_status IN ('pending', 'accepted', 'rejected')),
    CONSTRAINT ck_attendance_scan_events_validated_at
        CHECK (validation_status = 'pending' OR validated_at IS NOT NULL)
);

CREATE TABLE attendance_records (
    attendance_record_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institution_id INT NOT NULL,
    attendance_session_id BIGINT NOT NULL,
    student_id INT NOT NULL,
    attendance_status TEXT NOT NULL,
    record_source TEXT NOT NULL,
    recorded_by_teacher_id INT NOT NULL,
    finalized_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_attendance_records_session_student
        UNIQUE (attendance_session_id, student_id),
    CONSTRAINT uq_attendance_records_record_institution
        UNIQUE (attendance_record_id, institution_id),
    CONSTRAINT ck_attendance_records_status
        CHECK (attendance_status IN ('present', 'late', 'absent', 'excused')),
    CONSTRAINT ck_attendance_records_source
        CHECK (record_source IN ('validated_scan', 'manual', 'accessibility_alternative', 'import'))
);

CREATE TABLE attendance_corrections (
    attendance_correction_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institution_id INT NOT NULL,
    attendance_record_id BIGINT NOT NULL,
    corrected_by_teacher_id INT NOT NULL,
    previous_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    correction_reason TEXT NOT NULL,
    corrected_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_attendance_corrections_previous_status
        CHECK (previous_status IN ('present', 'late', 'absent', 'excused')),
    CONSTRAINT ck_attendance_corrections_new_status
        CHECK (new_status IN ('present', 'late', 'absent', 'excused')),
    CONSTRAINT ck_attendance_corrections_changed
        CHECK (previous_status <> new_status),
    CONSTRAINT ck_attendance_corrections_reason_not_blank
        CHECK (BTRIM(correction_reason) <> '')
);

-- 6. AI-GENERATED ARTIFACTS AND PRIVATE ASSISTANT HISTORY

CREATE TABLE ai_generated_artifacts (
    ai_artifact_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institution_id INT NOT NULL,
    student_id INT,
    class_id INT,
    ai_model_version_id INT NOT NULL,
    supersedes_artifact_id BIGINT,
    artifact_type TEXT NOT NULL,
    title TEXT NOT NULL,
    artifact_body TEXT NOT NULL,
    language_code TEXT NOT NULL DEFAULT 'en',
    artifact_status TEXT NOT NULL DEFAULT 'active',
    generated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_ai_generated_artifacts_tenant_pair
        UNIQUE (ai_artifact_id, institution_id),
    CONSTRAINT ck_ai_generated_artifacts_scope
        CHECK (student_id IS NOT NULL OR class_id IS NOT NULL),
    CONSTRAINT ck_ai_generated_artifacts_type
        CHECK (artifact_type IN ('reviewer', 'notes', 'summary', 'explanation', 'task_decomposition')),
    CONSTRAINT ck_ai_generated_artifacts_status
        CHECK (artifact_status IN ('active', 'superseded', 'flagged', 'archived')),
    CONSTRAINT ck_ai_generated_artifacts_title_not_blank
        CHECK (BTRIM(title) <> ''),
    CONSTRAINT ck_ai_generated_artifacts_body_not_blank
        CHECK (BTRIM(artifact_body) <> '')
);

CREATE TABLE ai_artifact_activity_sources (
    institution_id INT NOT NULL,
    ai_artifact_id BIGINT NOT NULL,
    activity_version_id INT NOT NULL,
    PRIMARY KEY (ai_artifact_id, activity_version_id)
);

CREATE TABLE ai_artifact_material_sources (
    institution_id INT NOT NULL,
    ai_artifact_id BIGINT NOT NULL,
    material_version_id INT NOT NULL,
    PRIMARY KEY (ai_artifact_id, material_version_id)
);

CREATE TABLE assistant_conversations (
    assistant_conversation_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institution_id INT NOT NULL,
    student_id INT NOT NULL,
    conversation_title TEXT,
    conversation_status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_assistant_conversations_tenant_pair
        UNIQUE (assistant_conversation_id, institution_id),
    CONSTRAINT ck_assistant_conversations_status
        CHECK (conversation_status IN ('active', 'archived'))
);

CREATE TABLE assistant_messages (
    assistant_message_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institution_id INT NOT NULL,
    assistant_conversation_id BIGINT NOT NULL,
    ai_model_version_id INT,
    message_role TEXT NOT NULL,
    message_body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_assistant_messages_tenant_pair
        UNIQUE (assistant_message_id, institution_id),
    CONSTRAINT ck_assistant_messages_role
        CHECK (message_role IN ('student', 'assistant')),
    CONSTRAINT ck_assistant_messages_model_role
        CHECK (
            (message_role = 'student' AND ai_model_version_id IS NULL)
            OR
            (message_role = 'assistant' AND ai_model_version_id IS NOT NULL)
        ),
    CONSTRAINT ck_assistant_messages_body_not_blank
        CHECK (BTRIM(message_body) <> '')
);

CREATE TABLE assistant_message_sources (
    assistant_message_source_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institution_id INT NOT NULL,
    assistant_message_id BIGINT NOT NULL,
    activity_version_id INT,
    material_version_id INT,
    source_label TEXT,
    CONSTRAINT ck_assistant_message_sources_one_source
        CHECK (
            (activity_version_id IS NOT NULL AND material_version_id IS NULL)
            OR
            (activity_version_id IS NULL AND material_version_id IS NOT NULL)
        )
);

-- 7. FLASHCARDS AND PRACTICE

CREATE TABLE flashcard_sets (
    flashcard_set_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institution_id INT NOT NULL,
    student_id INT NOT NULL,
    source_artifact_id BIGINT,
    set_title TEXT NOT NULL,
    language_code TEXT NOT NULL DEFAULT 'en',
    set_status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_flashcard_sets_set_owner
        UNIQUE (flashcard_set_id, student_id, institution_id),
    CONSTRAINT ck_flashcard_sets_title_not_blank CHECK (BTRIM(set_title) <> ''),
    CONSTRAINT ck_flashcard_sets_status
        CHECK (set_status IN ('active', 'archived'))
);

CREATE TABLE flashcards (
    flashcard_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    flashcard_set_id BIGINT NOT NULL,
    institution_id INT NOT NULL,
    student_id INT NOT NULL,
    question_text TEXT NOT NULL,
    answer_text TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 1,
    is_removed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_flashcards_card_owner
        UNIQUE (flashcard_id, student_id, institution_id),
    CONSTRAINT uq_flashcards_card_institution
        UNIQUE (flashcard_id, institution_id),
    CONSTRAINT ck_flashcards_question_not_blank CHECK (BTRIM(question_text) <> ''),
    CONSTRAINT ck_flashcards_answer_not_blank CHECK (BTRIM(answer_text) <> ''),
    CONSTRAINT ck_flashcards_display_order CHECK (display_order > 0)
);

CREATE TABLE flashcard_sources (
    institution_id INT NOT NULL,
    flashcard_id BIGINT NOT NULL,
    material_version_id INT NOT NULL,
    PRIMARY KEY (flashcard_id, material_version_id)
);

CREATE TABLE flashcard_practice_attempts (
    practice_attempt_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institution_id INT NOT NULL,
    student_id INT NOT NULL,
    flashcard_id BIGINT NOT NULL,
    client_event_id UUID,
    response_rating TEXT NOT NULL,
    response_text TEXT,
    response_time_ms INT,
    attempted_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_flashcard_attempts_client_event UNIQUE (client_event_id),
    CONSTRAINT ck_flashcard_attempts_rating
        CHECK (response_rating IN ('known', 'uncertain', 'not_known')),
    CONSTRAINT ck_flashcard_attempts_response_time
        CHECK (response_time_ms IS NULL OR response_time_ms >= 0)
);

CREATE TABLE flashcard_review_states (
    flashcard_id BIGINT PRIMARY KEY,
    institution_id INT NOT NULL,
    student_id INT NOT NULL,
    next_review_at TIMESTAMPTZ,
    interval_days INT NOT NULL DEFAULT 0,
    ease_factor NUMERIC(4,2) NOT NULL DEFAULT 2.50,
    consecutive_successes INT NOT NULL DEFAULT 0,
    last_reviewed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_flashcard_review_states_interval CHECK (interval_days >= 0),
    CONSTRAINT ck_flashcard_review_states_ease
        CHECK (ease_factor BETWEEN 1.30 AND 5.00),
    CONSTRAINT ck_flashcard_review_states_successes
        CHECK (consecutive_successes >= 0)
);

-- 8. MACHINE LEARNING

CREATE TABLE ml_model_versions (
    ml_model_version_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    model_name TEXT NOT NULL,
    version_identifier TEXT NOT NULL,
    task_type TEXT NOT NULL,
    algorithm_name TEXT NOT NULL,
    artifact_uri TEXT NOT NULL,
    evaluation_summary JSONB,
    trained_at TIMESTAMPTZ NOT NULL,
    activated_at TIMESTAMPTZ,
    retired_at TIMESTAMPTZ,
    CONSTRAINT uq_ml_model_versions_identity
        UNIQUE (model_name, version_identifier),
    CONSTRAINT ck_ml_model_versions_task_type
        CHECK (task_type IN ('regression', 'classification')),
    CONSTRAINT ck_ml_model_versions_time_range
        CHECK (retired_at IS NULL OR activated_at IS NULL OR retired_at >= activated_at)
);

CREATE TABLE ml_predictions (
    ml_prediction_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institution_id INT NOT NULL,
    student_id INT NOT NULL,
    student_task_id BIGINT,
    planned_session_id BIGINT,
    ml_model_version_id INT NOT NULL,
    difficulty_assessment_id INT,
    prediction_type TEXT NOT NULL,
    predicted_minutes INT,
    predicted_probability NUMERIC(6,5),
    feature_cutoff_at TIMESTAMPTZ NOT NULL,
    feature_snapshot JSONB NOT NULL,
    predicted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_ml_predictions_target
        CHECK (
            (student_task_id IS NOT NULL AND planned_session_id IS NULL)
            OR
            (student_task_id IS NULL AND planned_session_id IS NOT NULL)
        ),
    CONSTRAINT ck_ml_predictions_type
        CHECK (prediction_type IN ('completion_minutes', 'on_time_probability', 'session_completion_probability')),
    CONSTRAINT ck_ml_predictions_value_shape
        CHECK (
            (prediction_type = 'completion_minutes'
                AND predicted_minutes IS NOT NULL
                AND predicted_minutes >= 0
                AND predicted_probability IS NULL)
            OR
            (prediction_type IN ('on_time_probability', 'session_completion_probability')
                AND predicted_probability IS NOT NULL
                AND predicted_probability BETWEEN 0 AND 1
                AND predicted_minutes IS NULL)
        ),
    CONSTRAINT ck_ml_predictions_cutoff
        CHECK (feature_cutoff_at <= predicted_at),
    CONSTRAINT ck_ml_predictions_feature_snapshot_object
        CHECK (jsonb_typeof(feature_snapshot) = 'object')
);

CREATE TABLE ml_prediction_outcomes (
    ml_prediction_id BIGINT PRIMARY KEY,
    actual_minutes INT,
    actual_boolean BOOLEAN,
    observed_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT ck_ml_prediction_outcomes_one_value
        CHECK (
            (actual_minutes IS NOT NULL AND actual_boolean IS NULL AND actual_minutes >= 0)
            OR
            (actual_minutes IS NULL AND actual_boolean IS NOT NULL)
        )
);

-- 9. OFFLINE / SYNC AND NOTIFICATIONS

CREATE TABLE sync_operations (
    sync_operation_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institution_id INT NOT NULL,
    user_id INT NOT NULL,
    client_operation_id UUID NOT NULL,
    device_identifier TEXT NOT NULL,
    operation_kind TEXT NOT NULL,
    operation_payload JSONB NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    occurred_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMPTZ,
    resolution_message TEXT,
    CONSTRAINT uq_sync_operations_user_client_operation
        UNIQUE (user_id, client_operation_id),
    CONSTRAINT ck_sync_operations_kind
        CHECK (operation_kind IN ('student_note_upsert', 'flashcard_attempt_create', 'planner_change', 'attendance_scan_create', 'study_session_create')),
    CONSTRAINT ck_sync_operations_status
        CHECK (sync_status IN ('pending', 'applied', 'conflict', 'rejected')),
    CONSTRAINT ck_sync_operations_payload_object
        CHECK (jsonb_typeof(operation_payload) = 'object'),
    CONSTRAINT ck_sync_operations_resolution
        CHECK (sync_status = 'pending' OR resolved_at IS NOT NULL)
);

CREATE TABLE notifications (
    notification_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institution_id INT NOT NULL,
    recipient_user_id INT NOT NULL,
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message_body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMPTZ,
    CONSTRAINT ck_notifications_type
        CHECK (notification_type IN ('activity_update', 'deadline_conflict', 'attendance_update', 'planner_update', 'system')),
    CONSTRAINT ck_notifications_title_not_blank CHECK (BTRIM(title) <> ''),
    CONSTRAINT ck_notifications_body_not_blank CHECK (BTRIM(message_body) <> '')
);

-- ============================================================================
-- PART 2 - RELATIONSHIPS
-- ============================================================================

-- IDENTITY RELATIONSHIPS

ALTER TABLE institution_memberships
ADD CONSTRAINT fk_institution_memberships_institution_to_institutions
FOREIGN KEY (institution_id)
REFERENCES institutions(institution_id)
ON DELETE RESTRICT;

ALTER TABLE institution_memberships
ADD CONSTRAINT fk_institution_memberships_user_to_app_users
FOREIGN KEY (user_id)
REFERENCES application_users(user_id)
ON DELETE RESTRICT;

ALTER TABLE user_preferences
ADD CONSTRAINT fk_user_preferences_user_to_app_users
FOREIGN KEY (user_id)
REFERENCES application_users(user_id)
ON DELETE CASCADE;

ALTER TABLE student_profiles
ADD CONSTRAINT fk_student_profiles_user_tenant_role_to_memberships
FOREIGN KEY (user_id, institution_id, profile_role)
REFERENCES institution_memberships(user_id, institution_id, membership_role)
ON DELETE RESTRICT;

ALTER TABLE teacher_profiles
ADD CONSTRAINT fk_teacher_profiles_user_tenant_role_to_memberships
FOREIGN KEY (user_id, institution_id, profile_role)
REFERENCES institution_memberships(user_id, institution_id, membership_role)
ON DELETE RESTRICT;

-- ACADEMIC STRUCTURE RELATIONSHIPS

ALTER TABLE academic_terms
ADD CONSTRAINT fk_academic_terms_institution_to_institutions
FOREIGN KEY (institution_id)
REFERENCES institutions(institution_id)
ON DELETE RESTRICT;

ALTER TABLE subjects
ADD CONSTRAINT fk_subjects_institution_to_institutions
FOREIGN KEY (institution_id)
REFERENCES institutions(institution_id)
ON DELETE RESTRICT;

ALTER TABLE class_offerings
ADD CONSTRAINT fk_class_offerings_subject_tenant_to_subjects
FOREIGN KEY (subject_id, institution_id)
REFERENCES subjects(subject_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE class_offerings
ADD CONSTRAINT fk_class_offerings_term_tenant_to_academic_terms
FOREIGN KEY (academic_term_id, institution_id)
REFERENCES academic_terms(academic_term_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE class_meeting_patterns
ADD CONSTRAINT fk_class_meetings_class_tenant_to_class_offerings
FOREIGN KEY (class_id, institution_id)
REFERENCES class_offerings(class_id, institution_id)
ON DELETE CASCADE;

ALTER TABLE teacher_class_assignments
ADD CONSTRAINT fk_teacher_class_assignments_class_tenant_to_classes
FOREIGN KEY (class_id, institution_id)
REFERENCES class_offerings(class_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE teacher_class_assignments
ADD CONSTRAINT fk_teacher_class_assignments_teacher_tenant_to_profiles
FOREIGN KEY (teacher_id, institution_id)
REFERENCES teacher_profiles(teacher_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE class_enrollments
ADD CONSTRAINT fk_class_enrollments_class_tenant_to_classes
FOREIGN KEY (class_id, institution_id)
REFERENCES class_offerings(class_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE class_enrollments
ADD CONSTRAINT fk_class_enrollments_student_tenant_to_profiles
FOREIGN KEY (student_id, institution_id)
REFERENCES student_profiles(student_id, institution_id)
ON DELETE RESTRICT;

-- MATERIAL AND ACTIVITY RELATIONSHIPS

ALTER TABLE file_assets
ADD CONSTRAINT fk_file_assets_institution_to_institutions
FOREIGN KEY (institution_id)
REFERENCES institutions(institution_id)
ON DELETE RESTRICT;

ALTER TABLE file_assets
ADD CONSTRAINT fk_file_assets_uploader_tenant_to_memberships
FOREIGN KEY (uploaded_by_user_id, institution_id)
REFERENCES institution_memberships(user_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE learning_materials
ADD CONSTRAINT fk_learning_materials_teacher_class_to_assignments
FOREIGN KEY (created_by_teacher_id, class_id, institution_id)
REFERENCES teacher_class_assignments(teacher_id, class_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE learning_material_versions
ADD CONSTRAINT fk_material_versions_material_tenant_to_materials
FOREIGN KEY (learning_material_id, institution_id)
REFERENCES learning_materials(learning_material_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE learning_material_versions
ADD CONSTRAINT fk_material_versions_file_tenant_to_file_assets
FOREIGN KEY (file_asset_id, institution_id)
REFERENCES file_assets(file_asset_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE learning_material_versions
ADD CONSTRAINT fk_material_versions_teacher_tenant_to_profiles
FOREIGN KEY (created_by_teacher_id, institution_id)
REFERENCES teacher_profiles(teacher_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE learning_materials
ADD CONSTRAINT fk_materials_current_ver_to_material_versions
FOREIGN KEY (current_version_id, learning_material_id)
REFERENCES learning_material_versions(material_version_id, learning_material_id)
ON DELETE RESTRICT;

ALTER TABLE activity_types
ADD CONSTRAINT fk_activity_types_institution_to_institutions
FOREIGN KEY (institution_id)
REFERENCES institutions(institution_id)
ON DELETE RESTRICT;

ALTER TABLE academic_activities
ADD CONSTRAINT fk_academic_activities_type_tenant_to_activity_types
FOREIGN KEY (activity_type_id, institution_id)
REFERENCES activity_types(activity_type_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE academic_activities
ADD CONSTRAINT fk_academic_activities_teacher_class_to_assignments
FOREIGN KEY (created_by_teacher_id, class_id, institution_id)
REFERENCES teacher_class_assignments(teacher_id, class_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE academic_activity_versions
ADD CONSTRAINT fk_activity_versions_activity_tenant_to_activities
FOREIGN KEY (activity_id, institution_id)
REFERENCES academic_activities(activity_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE academic_activity_versions
ADD CONSTRAINT fk_activity_versions_teacher_tenant_to_profiles
FOREIGN KEY (created_by_teacher_id, institution_id)
REFERENCES teacher_profiles(teacher_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE academic_activities
ADD CONSTRAINT fk_activities_current_ver_to_activity_versions
FOREIGN KEY (current_version_id, activity_id)
REFERENCES academic_activity_versions(activity_version_id, activity_id)
ON DELETE RESTRICT;

ALTER TABLE activity_materials
ADD CONSTRAINT fk_activity_materials_activity_ver_to_activity_versions
FOREIGN KEY (activity_version_id, institution_id)
REFERENCES academic_activity_versions(activity_version_id, institution_id)
ON DELETE CASCADE;

ALTER TABLE activity_materials
ADD CONSTRAINT fk_activity_materials_material_ver_to_material_versions
FOREIGN KEY (material_version_id, institution_id)
REFERENCES learning_material_versions(material_version_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE difficulty_levels
ADD CONSTRAINT fk_difficulty_levels_rubric_to_difficulty_rubrics
FOREIGN KEY (difficulty_rubric_id)
REFERENCES difficulty_rubrics(difficulty_rubric_id)
ON DELETE RESTRICT;

ALTER TABLE activity_difficulty_assessments
ADD CONSTRAINT fk_diff_assess_activity_ver_tenant_to_activity_versions
FOREIGN KEY (activity_version_id, institution_id)
REFERENCES academic_activity_versions(activity_version_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE activity_difficulty_assessments
ADD CONSTRAINT fk_diff_assess_ai_model_ver_to_ai_model_versions
FOREIGN KEY (ai_model_version_id)
REFERENCES ai_model_versions(ai_model_version_id)
ON DELETE RESTRICT;

ALTER TABLE activity_difficulty_assessments
ADD CONSTRAINT fk_diff_assess_rubric_score_to_difficulty_levels
FOREIGN KEY (difficulty_rubric_id, standardized_score)
REFERENCES difficulty_levels(difficulty_rubric_id, standardized_score)
ON DELETE RESTRICT;

-- STUDENT PLANNER RELATIONSHIPS

ALTER TABLE student_activity_states
ADD CONSTRAINT fk_student_activity_states_student_tenant_to_profiles
FOREIGN KEY (student_id, institution_id)
REFERENCES student_profiles(student_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE student_activity_states
ADD CONSTRAINT fk_student_activity_states_activity_tenant_to_activities
FOREIGN KEY (activity_id, institution_id)
REFERENCES academic_activities(activity_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE student_activity_states
ADD CONSTRAINT fk_student_states_last_seen_ver_to_activity_versions
FOREIGN KEY (last_seen_activity_version_id, activity_id)
REFERENCES academic_activity_versions(activity_version_id, activity_id)
ON DELETE RESTRICT;

ALTER TABLE student_activity_states
ADD CONSTRAINT fk_student_states_completed_ver_to_activity_versions
FOREIGN KEY (completed_against_version_id, activity_id)
REFERENCES academic_activity_versions(activity_version_id, activity_id)
ON DELETE RESTRICT;

ALTER TABLE student_tasks
ADD CONSTRAINT fk_student_tasks_student_tenant_to_profiles
FOREIGN KEY (student_id, institution_id)
REFERENCES student_profiles(student_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE student_tasks
ADD CONSTRAINT fk_student_tasks_activity_tenant_to_activities
FOREIGN KEY (activity_id, institution_id)
REFERENCES academic_activities(activity_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE student_tasks
ADD CONSTRAINT fk_student_tasks_parent_owner_to_student_tasks
FOREIGN KEY (parent_task_id, student_id, institution_id)
REFERENCES student_tasks(student_task_id, student_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE task_dependencies
ADD CONSTRAINT fk_task_dependencies_predecessor_owner_to_student_tasks
FOREIGN KEY (predecessor_task_id, student_id, institution_id)
REFERENCES student_tasks(student_task_id, student_id, institution_id)
ON DELETE CASCADE;

ALTER TABLE task_dependencies
ADD CONSTRAINT fk_task_dependencies_successor_owner_to_student_tasks
FOREIGN KEY (successor_task_id, student_id, institution_id)
REFERENCES student_tasks(student_task_id, student_id, institution_id)
ON DELETE CASCADE;

ALTER TABLE student_time_blocks
ADD CONSTRAINT fk_student_time_blocks_student_tenant_to_profiles
FOREIGN KEY (student_id, institution_id)
REFERENCES student_profiles(student_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE planner_recommendations
ADD CONSTRAINT fk_planner_recs_student_tenant_to_profiles
FOREIGN KEY (student_id, institution_id)
REFERENCES student_profiles(student_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE planner_recommendations
ADD CONSTRAINT fk_planner_recs_task_owner_to_student_tasks
FOREIGN KEY (student_task_id, student_id, institution_id)
REFERENCES student_tasks(student_task_id, student_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE planner_recommendations
ADD CONSTRAINT fk_planner_recs_ai_model_ver_to_ai_model_versions
FOREIGN KEY (ai_model_version_id)
REFERENCES ai_model_versions(ai_model_version_id)
ON DELETE RESTRICT;

ALTER TABLE planned_study_sessions
ADD CONSTRAINT fk_planned_sessions_student_tenant_to_profiles
FOREIGN KEY (student_id, institution_id)
REFERENCES student_profiles(student_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE planned_study_sessions
ADD CONSTRAINT fk_planned_sessions_task_owner_to_student_tasks
FOREIGN KEY (student_task_id, student_id, institution_id)
REFERENCES student_tasks(student_task_id, student_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE planned_study_sessions
ADD CONSTRAINT fk_planned_sessions_recommendation_owner_to_recs
FOREIGN KEY (planner_recommendation_id, student_task_id, student_id, institution_id)
REFERENCES planner_recommendations(planner_recommendation_id, student_task_id, student_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE planned_study_sessions
ADD CONSTRAINT fk_planned_sessions_replaced_owner_to_planned_sessions
FOREIGN KEY (replaces_planned_session_id, student_task_id, student_id, institution_id)
REFERENCES planned_study_sessions(planned_session_id, student_task_id, student_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE study_sessions
ADD CONSTRAINT fk_study_sessions_student_tenant_to_profiles
FOREIGN KEY (student_id, institution_id)
REFERENCES student_profiles(student_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE study_sessions
ADD CONSTRAINT fk_study_sessions_task_owner_to_student_tasks
FOREIGN KEY (student_task_id, student_id, institution_id)
REFERENCES student_tasks(student_task_id, student_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE study_sessions
ADD CONSTRAINT fk_study_sessions_plan_owner_to_planned_sessions
FOREIGN KEY (planned_session_id, student_task_id, student_id, institution_id)
REFERENCES planned_study_sessions(planned_session_id, student_task_id, student_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE student_notes
ADD CONSTRAINT fk_student_notes_student_tenant_to_profiles
FOREIGN KEY (student_id, institution_id)
REFERENCES student_profiles(student_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE student_notes
ADD CONSTRAINT fk_student_notes_activity_ver_tenant_to_activity_versions
FOREIGN KEY (activity_version_id, institution_id)
REFERENCES academic_activity_versions(activity_version_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE student_notes
ADD CONSTRAINT fk_student_notes_material_ver_tenant_to_material_versions
FOREIGN KEY (material_version_id, institution_id)
REFERENCES learning_material_versions(material_version_id, institution_id)
ON DELETE RESTRICT;

-- ATTENDANCE RELATIONSHIPS

ALTER TABLE attendance_sessions
ADD CONSTRAINT fk_attendance_sessions_teacher_class_to_assignments
FOREIGN KEY (opened_by_teacher_id, class_id, institution_id)
REFERENCES teacher_class_assignments(teacher_id, class_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE attendance_tokens
ADD CONSTRAINT fk_attendance_tokens_session_to_attendance_sessions
FOREIGN KEY (attendance_session_id)
REFERENCES attendance_sessions(attendance_session_id)
ON DELETE RESTRICT;

ALTER TABLE attendance_scan_events
ADD CONSTRAINT fk_attendance_scans_session_tenant_to_sessions
FOREIGN KEY (attendance_session_id, institution_id)
REFERENCES attendance_sessions(attendance_session_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE attendance_scan_events
ADD CONSTRAINT fk_attendance_scans_token_to_attendance_tokens
FOREIGN KEY (attendance_token_id, attendance_session_id)
REFERENCES attendance_tokens(attendance_token_id, attendance_session_id)
ON DELETE RESTRICT;

ALTER TABLE attendance_scan_events
ADD CONSTRAINT fk_attendance_scans_student_tenant_to_profiles
FOREIGN KEY (student_id, institution_id)
REFERENCES student_profiles(student_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE attendance_records
ADD CONSTRAINT fk_attendance_records_session_tenant_to_sessions
FOREIGN KEY (attendance_session_id, institution_id)
REFERENCES attendance_sessions(attendance_session_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE attendance_records
ADD CONSTRAINT fk_attendance_records_student_tenant_to_profiles
FOREIGN KEY (student_id, institution_id)
REFERENCES student_profiles(student_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE attendance_records
ADD CONSTRAINT fk_attendance_records_teacher_tenant_to_profiles
FOREIGN KEY (recorded_by_teacher_id, institution_id)
REFERENCES teacher_profiles(teacher_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE attendance_corrections
ADD CONSTRAINT fk_attendance_corrections_record_tenant_to_records
FOREIGN KEY (attendance_record_id, institution_id)
REFERENCES attendance_records(attendance_record_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE attendance_corrections
ADD CONSTRAINT fk_attendance_corrections_teacher_tenant_to_profiles
FOREIGN KEY (corrected_by_teacher_id, institution_id)
REFERENCES teacher_profiles(teacher_id, institution_id)
ON DELETE RESTRICT;

-- AI ARTIFACT AND ASSISTANT RELATIONSHIPS

ALTER TABLE ai_generated_artifacts
ADD CONSTRAINT fk_ai_artifacts_institution_to_institutions
FOREIGN KEY (institution_id)
REFERENCES institutions(institution_id)
ON DELETE RESTRICT;

ALTER TABLE ai_generated_artifacts
ADD CONSTRAINT fk_ai_artifacts_student_tenant_to_profiles
FOREIGN KEY (student_id, institution_id)
REFERENCES student_profiles(student_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE ai_generated_artifacts
ADD CONSTRAINT fk_ai_artifacts_class_tenant_to_classes
FOREIGN KEY (class_id, institution_id)
REFERENCES class_offerings(class_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE ai_generated_artifacts
ADD CONSTRAINT fk_ai_artifacts_model_ver_to_ai_model_versions
FOREIGN KEY (ai_model_version_id)
REFERENCES ai_model_versions(ai_model_version_id)
ON DELETE RESTRICT;

ALTER TABLE ai_generated_artifacts
ADD CONSTRAINT fk_ai_artifacts_supersedes_to_ai_artifacts
FOREIGN KEY (supersedes_artifact_id, institution_id)
REFERENCES ai_generated_artifacts(ai_artifact_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE ai_artifact_activity_sources
ADD CONSTRAINT fk_ai_artifact_activity_sources_artifact_to_ai_artifacts
FOREIGN KEY (ai_artifact_id, institution_id)
REFERENCES ai_generated_artifacts(ai_artifact_id, institution_id)
ON DELETE CASCADE;

ALTER TABLE ai_artifact_activity_sources
ADD CONSTRAINT fk_ai_artifact_activity_sources_ver_to_activity_versions
FOREIGN KEY (activity_version_id, institution_id)
REFERENCES academic_activity_versions(activity_version_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE ai_artifact_material_sources
ADD CONSTRAINT fk_ai_artifact_material_sources_artifact_to_ai_artifacts
FOREIGN KEY (ai_artifact_id, institution_id)
REFERENCES ai_generated_artifacts(ai_artifact_id, institution_id)
ON DELETE CASCADE;

ALTER TABLE ai_artifact_material_sources
ADD CONSTRAINT fk_ai_artifact_material_sources_ver_to_material_versions
FOREIGN KEY (material_version_id, institution_id)
REFERENCES learning_material_versions(material_version_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE assistant_conversations
ADD CONSTRAINT fk_assistant_conversations_student_tenant_to_profiles
FOREIGN KEY (student_id, institution_id)
REFERENCES student_profiles(student_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE assistant_messages
ADD CONSTRAINT fk_assistant_messages_conversation_to_conversations
FOREIGN KEY (assistant_conversation_id, institution_id)
REFERENCES assistant_conversations(assistant_conversation_id, institution_id)
ON DELETE CASCADE;

ALTER TABLE assistant_messages
ADD CONSTRAINT fk_assistant_messages_model_ver_to_ai_model_versions
FOREIGN KEY (ai_model_version_id)
REFERENCES ai_model_versions(ai_model_version_id)
ON DELETE RESTRICT;

ALTER TABLE assistant_message_sources
ADD CONSTRAINT fk_assistant_message_sources_message_to_messages
FOREIGN KEY (assistant_message_id, institution_id)
REFERENCES assistant_messages(assistant_message_id, institution_id)
ON DELETE CASCADE;

ALTER TABLE assistant_message_sources
ADD CONSTRAINT fk_assistant_message_sources_act_ver_to_activity_versions
FOREIGN KEY (activity_version_id, institution_id)
REFERENCES academic_activity_versions(activity_version_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE assistant_message_sources
ADD CONSTRAINT fk_assistant_message_sources_mat_ver_to_material_versions
FOREIGN KEY (material_version_id, institution_id)
REFERENCES learning_material_versions(material_version_id, institution_id)
ON DELETE RESTRICT;

-- FLASHCARD RELATIONSHIPS

ALTER TABLE flashcard_sets
ADD CONSTRAINT fk_flashcard_sets_student_tenant_to_profiles
FOREIGN KEY (student_id, institution_id)
REFERENCES student_profiles(student_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE flashcard_sets
ADD CONSTRAINT fk_flashcard_sets_artifact_tenant_to_ai_artifacts
FOREIGN KEY (source_artifact_id, institution_id)
REFERENCES ai_generated_artifacts(ai_artifact_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE flashcards
ADD CONSTRAINT fk_flashcards_set_owner_to_flashcard_sets
FOREIGN KEY (flashcard_set_id, student_id, institution_id)
REFERENCES flashcard_sets(flashcard_set_id, student_id, institution_id)
ON DELETE CASCADE;

ALTER TABLE flashcard_sources
ADD CONSTRAINT fk_flashcard_sources_card_to_flashcards
FOREIGN KEY (flashcard_id, institution_id)
REFERENCES flashcards(flashcard_id, institution_id)
ON DELETE CASCADE;

ALTER TABLE flashcard_sources
ADD CONSTRAINT fk_flashcard_sources_material_ver_to_material_versions
FOREIGN KEY (material_version_id, institution_id)
REFERENCES learning_material_versions(material_version_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE flashcard_practice_attempts
ADD CONSTRAINT fk_flashcard_attempts_card_owner_to_flashcards
FOREIGN KEY (flashcard_id, student_id, institution_id)
REFERENCES flashcards(flashcard_id, student_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE flashcard_review_states
ADD CONSTRAINT fk_flashcard_review_state_card_owner_to_flashcards
FOREIGN KEY (flashcard_id, student_id, institution_id)
REFERENCES flashcards(flashcard_id, student_id, institution_id)
ON DELETE CASCADE;

-- MACHINE-LEARNING RELATIONSHIPS

ALTER TABLE ml_predictions
ADD CONSTRAINT fk_ml_predictions_student_tenant_to_profiles
FOREIGN KEY (student_id, institution_id)
REFERENCES student_profiles(student_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE ml_predictions
ADD CONSTRAINT fk_ml_predictions_task_owner_to_student_tasks
FOREIGN KEY (student_task_id, student_id, institution_id)
REFERENCES student_tasks(student_task_id, student_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE ml_predictions
ADD CONSTRAINT fk_ml_predictions_plan_owner_to_planned_sessions
FOREIGN KEY (planned_session_id, student_id, institution_id)
REFERENCES planned_study_sessions(planned_session_id, student_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE ml_predictions
ADD CONSTRAINT fk_ml_predictions_model_ver_to_ml_model_versions
FOREIGN KEY (ml_model_version_id)
REFERENCES ml_model_versions(ml_model_version_id)
ON DELETE RESTRICT;

ALTER TABLE ml_predictions
ADD CONSTRAINT fk_ml_predictions_diff_assess_tenant_to_diff_assessments
FOREIGN KEY (difficulty_assessment_id, institution_id)
REFERENCES activity_difficulty_assessments(difficulty_assessment_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE ml_prediction_outcomes
ADD CONSTRAINT fk_ml_prediction_outcomes_prediction_to_ml_predictions
FOREIGN KEY (ml_prediction_id)
REFERENCES ml_predictions(ml_prediction_id)
ON DELETE RESTRICT;

-- OFFLINE / SYNC AND NOTIFICATION RELATIONSHIPS

ALTER TABLE sync_operations
ADD CONSTRAINT fk_sync_operations_user_tenant_to_memberships
FOREIGN KEY (user_id, institution_id)
REFERENCES institution_memberships(user_id, institution_id)
ON DELETE RESTRICT;

ALTER TABLE notifications
ADD CONSTRAINT fk_notifications_recipient_tenant_to_memberships
FOREIGN KEY (recipient_user_id, institution_id)
REFERENCES institution_memberships(user_id, institution_id)
ON DELETE RESTRICT;

-- ============================================================================
-- PART 3 - JUSTIFIED INDEXES
-- ============================================================================

-- Tenant membership, roster, and Teacher class access.
CREATE INDEX idx_memberships_tenant_role_active
    ON institution_memberships (institution_id, membership_role, user_id)
    WHERE is_active = TRUE;

CREATE INDEX idx_class_enrollments_tenant_class_status
    ON class_enrollments (institution_id, class_id, enrollment_status, student_id);

CREATE INDEX idx_teacher_assignments_tenant_class
    ON teacher_class_assignments (institution_id, class_id, teacher_id);

-- Current and upcoming class work.
CREATE INDEX idx_academic_activities_tenant_class
    ON academic_activities (institution_id, class_id);

CREATE INDEX idx_activity_versions_tenant_due_at
    ON academic_activity_versions (institution_id, due_at)
    WHERE publication_status = 'published';

CREATE INDEX idx_activity_materials_tenant_material_ver
    ON activity_materials (institution_id, material_version_id);

-- At most one current AI assessment per exact activity version.
CREATE UNIQUE INDEX uq_diff_assessments_current_activity_version
    ON activity_difficulty_assessments (activity_version_id)
    WHERE superseded_at IS NULL;

CREATE INDEX idx_diff_assess_tenant_activity_assessed
    ON activity_difficulty_assessments
        (institution_id, activity_version_id, assessed_at DESC);

-- Student dashboard and planning access paths.
CREATE INDEX idx_student_states_tenant_student_status
    ON student_activity_states (institution_id, student_id, activity_status);

CREATE INDEX idx_student_tasks_tenant_student_status_due
    ON student_tasks (institution_id, student_id, task_status, due_at);

CREATE INDEX idx_student_tasks_parent
    ON student_tasks (parent_task_id)
    WHERE parent_task_id IS NOT NULL;

CREATE INDEX idx_task_dependencies_successor
    ON task_dependencies (successor_task_id);

CREATE INDEX idx_time_blocks_tenant_student_starts
    ON student_time_blocks (institution_id, student_id, starts_at);

CREATE INDEX idx_planned_sessions_tenant_student_start
    ON planned_study_sessions (institution_id, student_id, scheduled_start_at);

CREATE INDEX idx_study_sessions_tenant_student_started
    ON study_sessions (institution_id, student_id, started_at DESC);

CREATE INDEX idx_student_notes_tenant_student_updated
    ON student_notes (institution_id, student_id, updated_at DESC);

-- Attendance review and reporting.
CREATE INDEX idx_attendance_sessions_tenant_class_opens
    ON attendance_sessions (institution_id, class_id, opens_at DESC);

CREATE INDEX idx_attendance_scans_tenant_session_status
    ON attendance_scan_events
        (institution_id, attendance_session_id, validation_status);

CREATE INDEX idx_attendance_records_tenant_student
    ON attendance_records (institution_id, student_id, attendance_session_id);

CREATE INDEX idx_attendance_corrections_record
    ON attendance_corrections (attendance_record_id, corrected_at DESC);

-- AI source and private conversation navigation.
CREATE INDEX idx_ai_artifacts_tenant_student_generated
    ON ai_generated_artifacts (institution_id, student_id, generated_at DESC);

CREATE INDEX idx_ai_artifact_act_sources_tenant_ver
    ON ai_artifact_activity_sources (institution_id, activity_version_id);

CREATE INDEX idx_ai_artifact_mat_sources_tenant_ver
    ON ai_artifact_material_sources (institution_id, material_version_id);

CREATE INDEX idx_assistant_messages_conversation_created
    ON assistant_messages (institution_id, assistant_conversation_id, created_at);

CREATE UNIQUE INDEX uq_assistant_msg_sources_message_activity
    ON assistant_message_sources (assistant_message_id, activity_version_id)
    WHERE activity_version_id IS NOT NULL;

CREATE UNIQUE INDEX uq_assistant_msg_sources_message_material
    ON assistant_message_sources (assistant_message_id, material_version_id)
    WHERE material_version_id IS NOT NULL;

CREATE INDEX idx_assistant_sources_tenant_activity_ver
    ON assistant_message_sources (institution_id, activity_version_id)
    WHERE activity_version_id IS NOT NULL;

CREATE INDEX idx_assistant_sources_tenant_material_ver
    ON assistant_message_sources (institution_id, material_version_id)
    WHERE material_version_id IS NOT NULL;

-- Practice queue and ML evaluation.
CREATE INDEX idx_flashcards_tenant_student_set
    ON flashcards (institution_id, student_id, flashcard_set_id);

CREATE INDEX idx_flashcard_sources_tenant_material_ver
    ON flashcard_sources (institution_id, material_version_id);

CREATE INDEX idx_flashcard_review_tenant_student_due
    ON flashcard_review_states (institution_id, student_id, next_review_at);

CREATE INDEX idx_flashcard_attempts_tenant_student_attempted
    ON flashcard_practice_attempts
        (institution_id, student_id, attempted_at DESC);

CREATE INDEX idx_ml_predictions_tenant_student_predicted
    ON ml_predictions (institution_id, student_id, predicted_at DESC);

CREATE INDEX idx_ml_predictions_model_predicted
    ON ml_predictions (ml_model_version_id, predicted_at DESC);

-- Offline reconciliation and notification inbox.
CREATE INDEX idx_sync_operations_tenant_status_received
    ON sync_operations (institution_id, sync_status, received_at);

CREATE INDEX idx_notifications_tenant_recipient_unread
    ON notifications (institution_id, recipient_user_id, created_at DESC)
    WHERE read_at IS NULL;

-- Compact time-range indexes for append-heavy histories and retention jobs.
-- BRIN stays much smaller than B-tree when timestamps correlate with insert order.
CREATE INDEX idx_study_sessions_started_brin
    ON study_sessions USING BRIN (started_at) WITH (pages_per_range = 64);

CREATE INDEX idx_attendance_scans_scanned_brin
    ON attendance_scan_events USING BRIN (scanned_at) WITH (pages_per_range = 64);

CREATE INDEX idx_assistant_messages_created_brin
    ON assistant_messages USING BRIN (created_at) WITH (pages_per_range = 64);

CREATE INDEX idx_flashcard_attempts_attempted_brin
    ON flashcard_practice_attempts USING BRIN (attempted_at) WITH (pages_per_range = 64);

CREATE INDEX idx_ml_predictions_predicted_brin
    ON ml_predictions USING BRIN (predicted_at) WITH (pages_per_range = 64);

CREATE INDEX idx_sync_operations_occurred_brin
    ON sync_operations USING BRIN (occurred_at) WITH (pages_per_range = 64);

CREATE INDEX idx_notifications_created_brin
    ON notifications USING BRIN (created_at) WITH (pages_per_range = 64);

-- ============================================================================
-- PART 4 - CQRS READ MODELS
-- ============================================================================
-- Deployable views and the private analytics materialized view are defined in:
-- sql/gabai_read_models.sql
-- The materialized-view refresh command is documented at the end of that file.
--
-- Keep these views outside the LiamERD write-model import until the base model is
-- approved. Recommended ordinary views:
--   vw_student_upcoming_activities
--   vw_student_weekly_plan
--   vw_student_progress
--   vw_student_attendance
--   vw_teacher_class_activities
--   vw_teacher_attendance_summary
--   vw_ml_student_behavior_features_live
--
-- Private analytics read models:
--   analytics.mv_ml_student_behavior_features
--   analytics.vw_ml_activity_effort_training
