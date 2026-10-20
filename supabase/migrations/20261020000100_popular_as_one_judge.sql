-- Regra da GameJam 2025: o voto popular conta como mais um jurado.
-- Em cada critério, a média das estrelas junta cada avaliação do júri e, como
-- uma avaliação a mais, a média do público. Essa média vira pontos pelo peso do
-- critério (estrelas / 5 * peso) e a nota final é a soma dos pontos (0 a 100).
-- Ex.: 4 jurados + público -> o público pesa 1/5 em cada critério.
-- event_config.jury_weight deixa de ser usado (fica na tabela para não quebrar
-- versões do site que ainda o leem).

drop view public.team_results;
create view public.team_results
with (security_invoker = false)
as
with jury as (
  select
    t.id as team_id,
    count(e.id)::integer as n,
    coalesce(sum(e.creativity_innovation), 0) as creativity_innovation,
    coalesce(sum(e.technical_quality), 0) as technical_quality,
    coalesce(sum(e.theme_adequacy), 0) as theme_adequacy,
    coalesce(sum(e.inclusion_diversity_accessibility), 0) as inclusion_diversity_accessibility,
    coalesce(sum(e.gameplay_fun), 0) as gameplay_fun,
    coalesce(sum(e.art_sound_originality), 0) as art_sound_originality
  from public.teams t
  left join public.evaluations e on e.team_id = t.id and e.valid and e.kind = 'jury'
  group by t.id
),
popular as (
  select
    t.id as team_id,
    count(e.id)::integer as n,
    coalesce(avg(e.creativity_innovation), 0) as creativity_innovation,
    coalesce(avg(e.technical_quality), 0) as technical_quality,
    coalesce(avg(e.theme_adequacy), 0) as theme_adequacy,
    coalesce(avg(e.inclusion_diversity_accessibility), 0) as inclusion_diversity_accessibility,
    coalesce(avg(e.gameplay_fun), 0) as gameplay_fun,
    coalesce(avg(e.art_sound_originality), 0) as art_sound_originality
  from public.teams t
  left join public.evaluations e on e.team_id = t.id and e.valid and e.kind = 'popular'
  group by t.id
),
joined as (
  select
    t.id as team_id,
    t.name as team_name,
    t.game_title,
    j.n as jury_count,
    p.n as popular_count,
    -- Quantas "avaliações" entram na média: cada jurado + 1 pelo público (se houver).
    nullif(j.n + case when p.n > 0 then 1 else 0 end, 0) as raters,
    j.n::numeric as jury_n,
    j.creativity_innovation as j_ci, j.technical_quality as j_tq, j.theme_adequacy as j_ta,
    j.inclusion_diversity_accessibility as j_ida, j.gameplay_fun as j_gf, j.art_sound_originality as j_aso,
    p.creativity_innovation as p_ci, p.technical_quality as p_tq, p.theme_adequacy as p_ta,
    p.inclusion_diversity_accessibility as p_ida, p.gameplay_fun as p_gf, p.art_sound_originality as p_aso
  from public.teams t
  join jury j on j.team_id = t.id
  join popular p on p.team_id = t.id
),
scored as (
  select
    team_id,
    team_name,
    game_title,
    jury_count + popular_count as evaluation_count,
    jury_count,
    popular_count,
    -- Pontos por critério com o público como mais um jurado.
    (coalesce((j_ci + p_ci) / raters, 0) * 15 / 5)::double precision as creativity_innovation,
    (coalesce((j_tq + p_tq) / raters, 0) * 15 / 5)::double precision as technical_quality,
    (coalesce((j_ta + p_ta) / raters, 0) * 20 / 5)::double precision as theme_adequacy,
    (coalesce((j_ida + p_ida) / raters, 0) * 20 / 5)::double precision as inclusion_diversity_accessibility,
    (coalesce((j_gf + p_gf) / raters, 0) * 15 / 5)::double precision as gameplay_fun,
    (coalesce((j_aso + p_aso) / raters, 0) * 15 / 5)::double precision as art_sound_originality,
    -- Notas só do júri e só do público, com os mesmos pesos (para conferência).
    (coalesce((j_ci * 15 + j_tq * 15 + j_ta * 20 + j_ida * 20 + j_gf * 15 + j_aso * 15) / 5 / nullif(jury_n, 0), 0))::double precision
      as jury_score,
    ((p_ci * 15 + p_tq * 15 + p_ta * 20 + p_ida * 20 + p_gf * 15 + p_aso * 15) / 5)::double precision as popular_score
  from joined
),
final as (
  select
    s.*,
    s.creativity_innovation + s.technical_quality + s.theme_adequacy
      + s.inclusion_diversity_accessibility + s.gameplay_fun + s.art_sound_originality as final_score
  from scored s
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
  f.*
from final f;

revoke all on public.team_results from anon, authenticated;
grant select on public.team_results to anon, authenticated;
