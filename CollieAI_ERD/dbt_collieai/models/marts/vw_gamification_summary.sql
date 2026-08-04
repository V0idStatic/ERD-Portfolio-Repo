{{ config(materialized='view') }}

WITH reward_agg AS (
    SELECT
        r.student_id,
        SUM(r.points_earned) AS total_points_earned,
        COUNT(*) AS reward_transaction_count,
        ((ARRAY_AGG(
            r.reward_reason
            ORDER BY r.created_at DESC, r.reward_id DESC
        )))[1] AS latest_reward_reason,
        MAX(r.created_at) AS latest_reward_at
    FROM {{ source('lemma', 'reward_transactions') }} AS r
    GROUP BY r.student_id
),
item_agg AS (
    SELECT
        sai.student_id,
        COUNT(*) AS unlocked_item_count,
        COUNT(*) FILTER (WHERE sai.equipped IS TRUE) AS equipped_item_count,
        JSONB_AGG(
            JSONB_BUILD_OBJECT(
                'item_name', ai.item_name,
                'item_type', ai.item_type,
                'unlocked_at', sai.unlocked_at,
                'equipped', sai.equipped
            )
            ORDER BY sai.unlocked_at DESC, ai.item_id
        ) AS item_details
    FROM {{ source('lemma', 'student_avatar_items') }} AS sai
    JOIN {{ source('lemma', 'avatar_items') }} AS ai
        ON ai.item_id = sai.item_id
    GROUP BY sai.student_id
)
SELECT
    sp.student_id,
    av.avatar_name,
    COALESCE(sp.total_star_points, 0::double precision) AS total_star_points,
    COALESCE(sp.current_streak, 0) AS current_streak,
    COALESCE(ra.total_points_earned, 0) AS total_points_earned,
    COALESCE(ra.reward_transaction_count, 0) AS reward_transaction_count,
    ra.latest_reward_reason,
    ra.latest_reward_at,
    COALESCE(ia.unlocked_item_count, 0) AS unlocked_item_count,
    COALESCE(ia.equipped_item_count, 0) AS equipped_item_count,
    COALESCE(ia.item_details, '[]'::jsonb) AS item_details
FROM {{ source('lemma', 'student_profiles') }} AS sp
LEFT JOIN {{ source('lemma', 'avatars') }} AS av
    ON av.avatar_id = sp.avatar_id
LEFT JOIN reward_agg AS ra
    ON ra.student_id = sp.student_id
LEFT JOIN item_agg AS ia
    ON ia.student_id = sp.student_id


-- ============================================================================
-- MATERIALIZED VIEWS
-- ============================================================================
