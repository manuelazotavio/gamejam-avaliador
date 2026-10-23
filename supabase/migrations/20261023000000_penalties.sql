-- Penalidades do edital (item 12), aplicadas à pontuação final da equipe:
--   ausência na abertura, nas mentorias ou na mostra: -2 pontos por integrante ausente;
--   descumprimento do regulamento: -5 a -50 pontos, conforme a gravidade.
-- points guarda o desconto em positivo.

create table public.penalties (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  kind text not null check (kind in ('opening_absence', 'mentoring_absence', 'showcase_absence', 'rule_violation')),
  members integer check (members is null or members > 0),
  points integer not null,
  note text,
  created_at timestamptz not null default now(),
  constraint penalties_points_rule check (
    case
      when kind = 'rule_violation' then members is null and points between 5 and 50
      else members is not null and points = 2 * members
    end
  )
);

create index penalties_team_id_idx on public.penalties (team_id);

alter table public.penalties enable row level security;

create policy "admins gerenciam penalidades" on public.penalties
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- O placar calculado até aqui vira team_scores (interno); team_results passa a
-- descontar as penalidades da nota e refaz a classificação.
alter view public.team_results rename to team_scores;
revoke all on public.team_scores from anon, authenticated;

create view public.team_results
with (security_invoker = false)
as
with penalized as (
  select
    s.team_id,
    s.team_name,
    s.game_title,
    s.evaluation_count,
    s.jury_count,
    s.popular_count,
    s.creativity_innovation,
    s.technical_quality,
    s.theme_adequacy,
    s.inclusion_diversity_accessibility,
    s.gameplay_fun,
    s.art_sound_originality,
    s.jury_score,
    s.popular_score,
    s.final_score as base_score,
    coalesce(p.points, 0)::double precision as penalty_points,
    s.final_score - coalesce(p.points, 0) as final_score
  from public.team_scores s
  left join (
    select team_id, sum(points) as points from public.penalties group by team_id
  ) p on p.team_id = s.team_id
)
select
  row_number() over (
    order by
      final_score desc,
      creativity_innovation desc,
      technical_quality desc,
      theme_adequacy desc,
      inclusion_diversity_accessibility desc,
      gameplay_fun desc,
      art_sound_originality desc,
      lower(team_name)
  )::integer as rank,
  penalized.*
from penalized;

revoke all on public.team_results from anon, authenticated;
grant select on public.team_results to anon, authenticated;
