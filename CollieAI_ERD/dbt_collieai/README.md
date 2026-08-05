# LemmaAI dbt lineage

This project maps the write tables in `../collieAI.sql` as dbt sources. dbt will never run the table-creation statements from that file.

The models under `models/marts` are migrated read models from `../LemmaAI_Views.sql`. The first migration is `vw_student_learning_summary`; migrate the remaining views and MVs one at a time using the same pattern.

## Connect without committing secrets

Set these PowerShell environment variables for the current terminal:

```powershell
$env:DBT_HOST = 'your-project-ref.supabase.co'
$env:DBT_USER = 'postgres'
$env:DBT_PASSWORD = 'your-database-password'
$env:DBT_DBNAME = 'postgres'
$env:DBT_SCHEMA = 'analytics'
```

## Validate and open the lineage interface

```powershell
.\\.venv\\Scripts\\dbt.exe debug --project-dir dbt_collieai --profiles-dir dbt_collieai
.\\.venv\\Scripts\\dbt.exe run --project-dir dbt_collieai --profiles-dir dbt_collieai
.\\.venv\\Scripts\\dbt.exe docs generate --project-dir dbt_collieai --profiles-dir dbt_collieai
.\\.venv\\Scripts\\dbt.exe docs serve --project-dir dbt_collieai --profiles-dir dbt_collieai
```

Open the local address shown by `docs serve`, then choose **Lineage Graph**. The first graph shows the six write tables feeding `vw_student_learning_summary`.

## View source-column to MV-column mappings

Run the model, then query the lineage table whenever the graph only shows table-level connections:

```powershell
.\.venv\Scripts\dbt.exe run --select vw_column_lineage --project-dir dbt_collieai --profiles-dir dbt_collieai
```

```sql
SELECT mv_name, mv_column, source_table, source_column, transformation, lineage_type
FROM analytics.vw_column_lineage
WHERE mv_name = 'mv_weekly_skill_mastery'
ORDER BY mv_column, source_table, source_column;
```
