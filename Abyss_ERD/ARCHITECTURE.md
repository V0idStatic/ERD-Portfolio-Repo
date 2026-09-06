# ABYSS system architecture

This architecture uses one React Native codebase for Android, iOS, and web; FastAPI for the REST API; Python workers for statistics and matching; Supabase for managed PostgreSQL and object storage; Vercel for the web build; and Render for the API and background workers.

```mermaid
flowchart TB
    subgraph USERS[Users]
        PLAYER[Players]
        COACH[Coaches]
        STAFF[Moderators and admins]
    end

    subgraph CLIENTS[React Native clients]
        MOBILE[Android and iOS app]
        WEB[React Native Web]
        STATE[Client state and API cache]
        MOBILE --> STATE
        WEB --> STATE
    end

    subgraph FRONTEND_DEPLOY[Vercel]
        WEB_BUILD[Web production build]
        WEB_CDN[Static assets and edge CDN]
        WEB_BUILD --> WEB_CDN
    end

    subgraph BACKEND_DEPLOY[Render]
        API[FastAPI REST API]

        subgraph API_MODULES[Backend modules]
            AUTH[Accounts and authorization]
            PROFILE[Players squads and coaches]
            MATCH[Invites schedules and results]
            SOCIAL[Messages posts and notifications]
            MODERATION[Reports verification and administration]
            DISPLAY[Display endpoints]
            MATCHING[Match recommendation service]
        end

        WORKER[Python background worker]
        SCHEDULER[Scheduled jobs]
        STATS[Statistics calculator]
        FEATURES[Feature builder]
        TRAINING[ML training and evaluation]
        INFERENCE[Match compatibility scoring]

        API --> AUTH
        API --> PROFILE
        API --> MATCH
        API --> SOCIAL
        API --> MODERATION
        API --> DISPLAY
        API --> MATCHING
        SCHEDULER --> WORKER
        WORKER --> STATS
        WORKER --> FEATURES
        FEATURES --> TRAINING
        MATCHING --> INFERENCE
    end

    subgraph SUPABASE[Supabase cloud]
        subgraph POSTGRES[PostgreSQL]
            ENTITY[(Normal entity tables)]
            EVENTS[(event_outbox and request_receipts)]
            VIEWS[(vw_squad_profile<br/>vw_free_agents<br/>vw_matchmaking_squads<br/>other vw views)]
            MATERIALIZED[(mv_squad_statistics<br/>mv_leaderboard<br/>mv_admin_dashboard_metrics)]
            HISTORY[(match_participants<br/>participant_stat_values<br/>rating_changes)]
        end
        STORAGE[(Supabase Storage)]
    end

    MODEL_STORE[(Versioned ML model artifacts)]

    PLAYER --> MOBILE
    COACH --> MOBILE
    STAFF --> WEB
    WEB_BUILD --> WEB
    WEB_CDN --> WEB

    STATE -->|HTTPS JSON REST| API
    API -->|Validated writes in one transaction| ENTITY
    API -->|Retry and delivery records| EVENTS
    PROFILE -->|Signed upload request| STORAGE
    STORAGE -->|Stable object key| ENTITY

    ENTITY --> VIEWS
    ENTITY --> HISTORY
    EVENTS -->|Unpublished events| WORKER
    STATS -->|Refresh after accepted results| MATERIALIZED
    HISTORY --> STATS
    HISTORY --> FEATURES
    ENTITY --> FEATURES
    TRAINING -->|Approved model version| MODEL_STORE
    MODEL_STORE --> INFERENCE
    VIEWS --> DISPLAY
    MATERIALIZED --> DISPLAY
    VIEWS --> INFERENCE
    MATERIALIZED --> INFERENCE
    INFERENCE -->|Ranked compatible squads| MATCHING
    DISPLAY -->|Profile schedule dashboard and leaderboard| API
    MATCHING -->|Recommendations with score and reasons| API
    API -->|JSON response| STATE
```

## Main system flow

```mermaid
sequenceDiagram
    autonumber
    actor Coach
    participant App as React Native app
    participant API as FastAPI on Render
    participant DB as Supabase PostgreSQL
    participant Worker as Python worker
    participant ML as Matching model

    Coach->>App: Register squad and five players
    App->>API: POST squad and roster data
    API->>DB: Create squad, coach, player profiles, game profiles, and memberships
    DB-->>API: Entity IDs and versions
    API-->>App: Created squad profile

    Coach->>App: Find a compatible opponent
    App->>API: GET match recommendations
    API->>DB: Read vw_matchmaking_squads and mv_squad_statistics
    API->>ML: Score eligible squads using current features
    ML-->>API: Ranked squads and matching reasons
    API-->>App: Opponent cards with coaches, roster, win rate, and compatibility

    Coach->>App: Send scrim invitation
    App->>API: POST scrim invite
    API->>DB: Validate same game, coach authority, schedule, and save invite
    API-->>App: Pending invitation

    Coach->>App: Submit result and player statistics
    App->>API: POST result, evidence, and participant stats
    API->>DB: Save submission and historical match participants
    API->>DB: Finalize accepted result and append event
    Worker->>DB: Poll unprocessed result event
    Worker->>DB: Calculate totals, rating changes, and refresh materialized views
    Worker->>DB: Build historical matching features
    Worker->>ML: Periodically train and evaluate a new model
    ML-->>Worker: Approved version and evaluation metrics
    Worker->>ML: Store the approved version for future recommendations

    App->>API: GET updated squad dashboard
    API->>DB: Read vw display data and mv calculations
    DB-->>API: Updated wins, losses, win rate, rating, and rank
    API-->>App: Display-ready response
```

## Database responsibility

| Purpose | ERD objects |
|---|---|
| Permanent identity | `users`, `player_profiles`, `player_profile_claims` |
| Per-game player data | `games`, `game_modes`, `game_roles`, `game_ranks`, `game_characters`, `player_game_profiles` |
| Squad history | `squads`, `squad_coaches`, `squad_memberships` |
| Match history | `scrim_invites`, `scrims`, `match_participants`, `scrim_results` |
| Flexible game statistics | `stat_definitions`, `participant_stat_values`, `rating_changes` |
| Live display data | `vw_*` views |
| Stored calculations | `mv_squad_statistics`, `mv_leaderboard`, `mv_admin_dashboard_metrics` |
| Reliable background processing | `event_outbox`, `event_receipts`, `request_receipts` |

The mobile and web clients call FastAPI for business data. They do not write directly to PostgreSQL. FastAPI checks the user, coach permissions, game compatibility, and record versions before changing normal entity tables. `vw_*` objects provide current denormalized display data, while `mv_*` objects hold calculations that workers refresh after relevant changes.

The first matching version should use deterministic filters and a weighted score: same game and mode, region, availability overlap, squad rating difference, recent win rate, completed-match confidence, and roster completeness. The ML model should be introduced after enough accepted match history exists. Train it asynchronously, version every model, compare it with the existing scoring baseline, and keep the REST request limited to inference so training never delays the user.

React Native Web is deployed to Vercel. Android and iOS builds are distributed as mobile applications; they still call the same Render API. Render should run the FastAPI web service separately from the worker and scheduled training process so API traffic cannot be blocked by statistics refreshes or model training.
