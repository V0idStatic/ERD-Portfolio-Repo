-- GabAI post-deployment hardening and referential-integrity indexes
-- Apply after gabai_supabase_auth_rls.sql.

BEGIN;

-- These catalogs are intentionally backend-only. Explicit deny policies make
-- the access decision auditable while service_role retains its RLS bypass.
CREATE POLICY ai_model_versions_deny_client_access
ON public.ai_model_versions FOR SELECT TO authenticated
USING (FALSE);

CREATE POLICY ml_model_versions_deny_client_access
ON public.ml_model_versions FOR SELECT TO authenticated
USING (FALSE);

-- PostgreSQL does not automatically index referencing columns. Add a compact,
-- deterministic covering index for each public foreign key that does not
-- already have one. This keeps joins, deletes, and RLS helper lookups scalable.
DO $$
DECLARE
    fk RECORD;
    index_name TEXT;
BEGIN
    FOR fk IN
        SELECT
            c.conrelid,
            c.conname,
            c.conkey,
            c.conrelid::REGCLASS AS table_name,
            STRING_AGG(quote_ident(a.attname), ', ' ORDER BY key_col.ordinality)
                AS indexed_columns
        FROM pg_catalog.pg_constraint AS c
        CROSS JOIN LATERAL unnest(c.conkey)
            WITH ORDINALITY AS key_col(attnum, ordinality)
        JOIN pg_catalog.pg_attribute AS a
          ON a.attrelid = c.conrelid
         AND a.attnum = key_col.attnum
        JOIN pg_catalog.pg_namespace AS n
          ON n.oid = c.connamespace
        WHERE c.contype = 'f'
          AND n.nspname = 'public'
          AND NOT EXISTS (
              SELECT 1
              FROM pg_catalog.pg_index AS i
              WHERE i.indrelid = c.conrelid
                AND i.indisvalid
                AND i.indpred IS NULL
                AND (
                    SELECT ARRAY_AGG(index_col.attnum ORDER BY index_col.ordinality)
                    FROM unnest(i.indkey::SMALLINT[])
                        WITH ORDINALITY AS index_col(attnum, ordinality)
                    WHERE index_col.ordinality <= cardinality(c.conkey)
                ) = c.conkey
          )
        GROUP BY c.conrelid, c.conname, c.conkey
    LOOP
        index_name := 'idx_fk_' || SUBSTRING(
            md5(fk.conrelid::TEXT || ':' || fk.conname),
            1,
            16
        );

        EXECUTE format(
            'CREATE INDEX IF NOT EXISTS %I ON %s (%s)',
            index_name,
            fk.table_name,
            fk.indexed_columns
        );
    END LOOP;
END;
$$;

COMMIT;
