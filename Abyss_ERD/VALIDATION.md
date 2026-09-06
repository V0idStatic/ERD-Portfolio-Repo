# Schema validation

Validated on 2026-09-06. The complete `abyss.sql` executed in a fresh, isolated, in-memory PGlite 0.5.8 PostgreSQL WASM runtime. No live application database was changed.

Results: **49 entity/event tables, 124 foreign keys, 39 explicitly declared indexes, 30 checks passed.** All tables have numbered PostgreSQL metadata comments. The schema also has nine denormalized display views: `vw_squad_profile`, `vw_free_agents`, `vw_matchmaking_squads`, `vw_squad_schedule`, `vw_scrim_invites`, `vw_messages`, `vw_notification_inbox`, `vw_profile_feed`, and `vw_moderation_queue`, plus three calculated materialized views: `mv_squad_statistics`, `mv_leaderboard`, and `mv_admin_dashboard_metrics`.

The checks cover DDL execution, metadata completeness, account uniqueness, historical roster transfers, durable player identity, profile claiming, free-agent display, cross-game isolation, participant-stat retention after departure, invite and schedule constraints, result/submission scope, score consistency, denormalized views, materialized statistics/leaderboard calculations, moderation constraints, messaging, event/receipt deduplication, replay generations, and business/outbox transaction rollback.

The ERD was rebuilt using `@liam-hq/cli` 0.7.24. `scripts/annotate-erd.mjs` validates diagram FK endpoints/columns and preserves the `mv_*` labels. `local.cmd` now applies that step automatically after building.

Reproduce from this folder with Node.js and npm:

```powershell
npm install --prefix tmp/schema-tools --cache tmp/npm-cache --no-audit --no-fund @electric-sql/pglite@0.5.8 @liam-hq/cli@0.7.24
node scripts/validate-schema.mjs
node tmp/schema-tools/node_modules/@liam-hq/cli/dist-cli/bin/cli.js erd build --input abyss.sql --format postgres --output-dir dist
node scripts/annotate-erd.mjs
```

On the authoring machine the npm PATH shim was broken; the installation command used `node 'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js'` in place of `npm`. Downloaded tools and PDF inspection images are under ignored `tmp/`.

The ERD is an overview. PostgreSQL SQL is authoritative for CHECK expressions, partial/expression indexes, defaults and composite constraints; not every detail is displayed identically by the diagram renderer. Serve `dist/` over HTTP using `local.cmd` to view the graph; opening the HTML directly from disk is not supported by Liam.

These checks do **not** implement or validate write-service authorization, scheduling race prevention, worker retries, production permissions, migrations from existing data, real workload performance, or browser rendering. PGlite is useful for PostgreSQL DDL/constraint checks but does not replace multi-session integration tests on the deployment PostgreSQL version. The required application contracts and unconfirmed business policies are in `DESIGN.md`.
