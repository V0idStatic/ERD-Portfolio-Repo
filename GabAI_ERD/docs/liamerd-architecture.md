# GabAI LiamERD architecture review

This review treats the proposal as the product source of truth and the attached database brief as the scope correction. In particular, GabAI has only two application roles: `student` and `teacher`. An institution remains a tenant boundary, not an Administrator persona.

## A. Domain groups

1. Identity and tenant boundary
2. Academic structure and enrollment
3. Versioned learning materials and activities
4. Student-private planning and study history
5. Attendance evidence and final records
6. AI models, generated artifacts, and private assistant conversations
7. Flashcards and practice
8. ML models, predictions, and outcomes
9. Offline reconciliation and notifications

## B. Candidate tables and grain

### Identity

| Table | One row represents... |
| --- | --- |
| `institutions` | one school/tenant using GabAI |
| `application_users` | one global GabAI user linked to one Supabase Auth identity |
| `institution_memberships` | one user's Student or Teacher membership in one institution |
| `user_preferences` | one user's language, accessibility, notification, and optional-personalization preferences |
| `student_profiles` | one Student application profile |
| `teacher_profiles` | one Teacher application profile |

### Academic structure

| Table | One row represents... |
| --- | --- |
| `academic_terms` | one institution-defined academic period |
| `subjects` | one institution-defined course/subject |
| `class_offerings` | one subject section offered during one academic term |
| `class_meeting_patterns` | one recurring weekly meeting time for one class |
| `teacher_class_assignments` | one Teacher's authorized assignment to one class |
| `class_enrollments` | one Student's enrollment in one class |

### Materials and activities

| Table | One row represents... |
| --- | --- |
| `file_assets` | one stored file object and its immutable storage metadata |
| `learning_materials` | one logical Teacher-managed learning material in one class |
| `learning_material_versions` | one exact version of one learning material |
| `activity_types` | one institution-wide activity category such as assignment or quiz |
| `academic_activities` | one logical Teacher-created academic requirement for one class |
| `academic_activity_versions` | one immutable version of an activity's title, instructions, deadline, and publication state |
| `activity_materials` | one link from an activity version to an exact learning-material version |
| `activity_difficulty_assessments` | one AI-standardized difficulty assessment for one exact activity version at one time |

### Student planner and study history

| Table | One row represents... |
| --- | --- |
| `student_activity_states` | one Student's current personal execution state for one official activity |
| `student_tasks` | one Student-owned personal task or activity milestone |
| `task_dependencies` | one predecessor-to-successor relationship between two Student tasks |
| `student_time_blocks` | one private availability, commitment, preferred-time, or quiet-time block |
| `planner_recommendations` | one explainable AI scheduling recommendation for one Student task |
| `planned_study_sessions` | one accepted or manually created future study session |
| `study_sessions` | one actual Student study session and its measured outcome |
| `student_notes` | one private Student note linked optionally to an exact activity or material version |

### Attendance

| Table | One row represents... |
| --- | --- |
| `attendance_sessions` | one Teacher-opened attendance window for one class meeting |
| `attendance_tokens` | one short-lived hashed credential issued for an attendance session |
| `attendance_scan_events` | one Student scan attempt, including provisional offline evidence |
| `attendance_records` | one current official attendance decision for one Student in one session |
| `attendance_corrections` | one audited Teacher correction to an official attendance record |

### AI-generated information

| Table | One row represents... |
| --- | --- |
| `ai_model_versions` | one identifiable LLM/AI model version used by GabAI |
| `ai_generated_artifacts` | one generated reviewer, note, summary, explanation, or decomposition |
| `ai_artifact_activity_sources` | one artifact-to-activity-version provenance link |
| `ai_artifact_material_sources` | one artifact-to-material-version provenance link |
| `assistant_conversations` | one private Student assistant conversation |
| `assistant_messages` | one message in a private assistant conversation |
| `assistant_message_sources` | one source citation from an assistant message to an exact material version |

### Flashcards and practice

| Table | One row represents... |
| --- | --- |
| `flashcard_sets` | one Student-owned set of study cards |
| `flashcards` | one editable question-and-answer card |
| `flashcard_sources` | one card-to-material-version provenance link |
| `flashcard_practice_attempts` | one Student response to one card at one time |
| `flashcard_review_states` | one card's current deterministic spaced-review state for its owner |

### Machine learning

| Table | One row represents... |
| --- | --- |
| `ml_model_versions` | one trained regression or classification model version |
| `ml_predictions` | one Student-specific prediction made at a recorded cutoff time |
| `ml_prediction_outcomes` | one later observed outcome used to evaluate one prior prediction |

### Operations

| Table | One row represents... |
| --- | --- |
| `sync_operations` | one idempotent offline-originating client mutation submitted for reconciliation |
| `notifications` | one secondary delivery/read record for one user |

## C. Major relationships and cardinalities

- User many-to-many institution through `institution_memberships`; each membership has exactly one current application role.
- Institution 1-to-many memberships, terms, subjects, classes, activity types, files, and model metadata.
- Subject 1-to-many class offerings; academic term 1-to-many class offerings.
- Teacher many-to-many class through `teacher_class_assignments`.
- Student many-to-many class through `class_enrollments`.
- Class 1-to-many logical activities and learning materials.
- Logical activity 1-to-many immutable activity versions; exactly one version may be selected as current.
- Activity version many-to-many material version through `activity_materials`.
- Activity version 1-to-many difficulty assessments; at most one unsuperseded assessment exists for a version.
- Student and activity form a unique `student_activity_states` row; Student 1-to-many private tasks, plans, actual sessions, notes, conversations, and practice attempts.
- Attendance session 1-to-many scan events and official attendance records; an official record has 0-to-many corrections.
- Generated artifacts and assistant responses cite exact source versions, never only a mutable logical item.
- ML prediction belongs to one Student and optionally targets a task or planned session; its immutable feature snapshot and exact difficulty assessment preserve what was known at prediction time.

Tenant IDs are intentionally repeated on high-risk cross-tenant relationship tables. Composite foreign keys enforce that a profile, class, material, activity, and attendance record belong to the same institution. This is a security/integrity duplication, not denormalized display data.

## D. Teacher-owned records

Teachers author learning-material versions and academic-activity versions, assign materials to activity versions, open attendance sessions, issue/revoke attendance tokens, finalize attendance records, and record corrections. The Teacher may enter an expected duration, but this is explicitly named `teacher_estimated_minutes`; it is not the standardized difficulty.

## E. Student-owned records

Student activity state, tasks, task dependencies, time blocks, planner decisions, planned sessions, actual study sessions, personal notes, assistant conversations, flashcard sets, practice history, and preferences are structurally separate from Teacher-owned academic records. No Teacher foreign key grants access to these private tables.

## F. AI-generated records

The authoritative standardized difficulty is an append-only assessment tied to `academic_activity_versions`, with a 1-to-5 GabAI score, rubric version, AI model version, rationale, assessment time, and optional supersession time. The five-point scale is fixed by a named rubric version rather than by each Teacher. A prior version's current assessment automatically becomes stale for the logical activity when `academic_activities.current_version_id` advances.

Other AI outputs live in `ai_generated_artifacts` and preserve exact activity/material source versions. AI output never overwrites Teacher-authored source content. Private assistant history is kept in separate Student-owned tables.

## G. Machine-learning historical records

`ml_predictions` never overwrites an older prediction. It stores the prediction timestamp, feature cutoff, model version, optional exact AI difficulty assessment, target entity, output, and immutable JSONB feature snapshot. JSONB is justified here because feature schemas evolve between model versions and the snapshot is evidence, not a hidden relational source of truth. `ml_prediction_outcomes` records what happened later.

Proposed training grains:

- Activity-effort regression: one row per completed `student_activity_states` record. Target: actual completion minutes. Features are restricted to values known by the prediction cutoff, including the selected difficulty assessment, activity type/version, days to deadline, milestone count, and prior Student aggregates.
- On-time classification: one row per completed official activity state. Target: completed on time. Never use later deadline revisions or assessments created after the cutoff.
- Session-completion classification: one row per planned study session whose outcome window has closed. Target: whether an actual completed session occurred. Never use later reschedules as pre-prediction features.

## H. Source-of-truth classification

| Record | Source of truth |
| --- | --- |
| Activity instructions/deadline/publication state | current `academic_activity_versions` row selected by `academic_activities.current_version_id` |
| Learning material | current `learning_material_versions` row selected by `learning_materials.current_version_id` |
| Standardized activity difficulty | current unsuperseded `activity_difficulty_assessments` row for the exact current activity version |
| Student progress/task state | Student-owned planner/state tables; never inferred as an official grade |
| Attendance | `attendance_records`; scans are evidence only |
| AI reviewer/notes/explanation | `ai_generated_artifacts`, clearly generated and source-linked |
| Personalized effort/probability | immutable `ml_predictions`, advisory only |
| Notification | secondary delivery record only |

## I. Version and history requirements

- Activity versions are required because deadlines/instructions change and difficulty must be reproducible against the assessed content.
- Material versions are required because replaced files can make generated aids stale.
- Difficulty assessments are append-only and superseded, not overwritten.
- Attendance corrections preserve before/after status and reason.
- Predictions and their feature snapshots are append-only; outcomes are stored separately.
- Tasks and plans preserve rescheduling through a self-link to the replacement planned session.
- No universal `deleted_at` is used. Status/archival columns exist only where the lifecycle needs them.

## J. Ambiguous requirements resolved conservatively

- The proposal describes Administrator capabilities, but the corrected scope explicitly removes the Administrator application role. The schema retains `institutions` only as a tenant boundary.
- Submissions, grades, institution-configured attendance thresholds, private messaging, class discussion moderation, and external SIS/LMS synchronization ownership are future decisions, so no source-of-truth tables for them are included.
- One Supabase Auth identity may belong to multiple institutions through `institution_memberships`, while Student/Teacher profiles and all tenant-owned data remain institution-specific.
- The schema assumes activity type values are seeded per institution. It does not hardcode an arbitrary exhaustive list.
- Recurring timetable and availability rules use normalized weekly meeting rows plus concrete Student time blocks. A generic recurrence engine is intentionally excluded.

## K. Deliberate non-features / overengineering avoided

- No Administrator profile or role.
- No enterprise RBAC, generic workflow engine, event sourcing, gradebook, submission system, full SIS, generic audit platform, or model-binary storage.
- No Teacher-defined authoritative difficulty and no Student-specific prediction stored on the activity.
- No QR image or plaintext attendance secret storage.
- No `sync_status` scattered across domain tables.
- No operational dashboard is materialized because deadlines, plans, and attendance must stay current. Only stale-tolerant private ML/analytics aggregates may be materialized.

## CQRS read-model recommendations

| Read model | Source tables | Type | Reason |
| --- | --- | --- | --- |
| `vw_student_upcoming_activities` | enrollments, activities/current versions, Student state, current difficulty | VIEW - OPS/STUDENT | current trusted requirements plus private state |
| `vw_student_weekly_plan` | tasks, recommendations, planned sessions, time blocks | VIEW - OPS/STUDENT | planner timeline without denormalizing write tables |
| `vw_student_progress` | activity state, study sessions, flashcard review state | VIEW - OPS/STUDENT | actionable Student-only progress summary |
| `vw_student_attendance` | attendance sessions and records | VIEW - OPS/STUDENT | current official statuses only; excludes raw scan evidence by default |
| `vw_teacher_class_activities` | Teacher assignments, classes, activities/current versions, difficulty | VIEW - OPS/TEACHER | Teacher's current class activity list and AI assessment status |
| `vw_teacher_attendance_summary` | sessions and official records | VIEW - OPS/TEACHER | present/late/absent counts from finalized records |
| `vw_ml_student_behavior_features_live` | completed states, study sessions, and flashcard attempts | VIEW - ML/LIVE | current Student-owned features used to create a new prediction snapshot |
| `analytics.mv_ml_student_behavior_features` | completed states, study sessions, and flashcard attempts | MATERIALIZED VIEW - ML/CACHE | private reusable ML aggregate for repeated server-side inference and analysis |
| `analytics.vw_ml_activity_effort_training` | predictions, snapshots, outcomes, activity versions | VIEW - ML/TRAINING | private reproducible training/evaluation rows with an explicit prediction cutoff |

The materialized feature aggregate is optional at hackathon scale but is supplied for the Supabase implementation. It must remain outside the exposed API schema and be refreshed on a schedule appropriate to acceptable staleness. All Student-facing and Teacher-facing operational views remain ordinary views so deadlines, attendance decisions, and planner state stay current.
