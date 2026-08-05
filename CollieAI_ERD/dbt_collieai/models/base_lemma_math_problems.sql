with source as (
        select * from {{ source('lemma', 'math_problems') }}
  ),
  renamed as (
      select
          {{ adapter.quote("problem_id") }},
        {{ adapter.quote("skill_id") }},
        {{ adapter.quote("difficulty_id") }},
        {{ adapter.quote("problem_text") }},
        {{ adapter.quote("correct_answer") }},
        {{ adapter.quote("solution_pattern") }}

      from source
  )
  select * from renamed
    