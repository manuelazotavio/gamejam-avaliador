-- Avaliação por estrelas: cada critério recebe de 0 a 5 estrelas, com meia estrela.
-- As colunas passam a guardar as estrelas; o placar converte para pontos com o
-- peso de cada critério (15 ou 20), mantendo a nota final de 0 a 100.

drop view public.team_results;

alter table public.evaluations
  drop constraint evaluations_creativity_innovation_check,
  drop constraint evaluations_technical_quality_check,
  drop constraint evaluations_theme_adequacy_check,
  drop constraint evaluations_inclusion_diversity_accessibility_check,
  drop constraint evaluations_gameplay_fun_check,
  drop constraint evaluations_art_sound_originality_check;

-- Avaliações já registradas em pontos viram a meia estrela mais próxima.
alter table public.evaluations
  alter column creativity_innovation type numeric(2, 1)
    using round(creativity_innovation * 10 / 15.0) / 2,
  alter column technical_quality type numeric(2, 1)
    using round(technical_quality * 10 / 15.0) / 2,
  alter column theme_adequacy type numeric(2, 1)
    using round(theme_adequacy * 10 / 20.0) / 2,
  alter column inclusion_diversity_accessibility type numeric(2, 1)
    using round(inclusion_diversity_accessibility * 10 / 20.0) / 2,
  alter column gameplay_fun type numeric(2, 1)
    using round(gameplay_fun * 10 / 15.0) / 2,
  alter column art_sound_originality type numeric(2, 1)
    using round(art_sound_originality * 10 / 15.0) / 2;

alter table public.evaluations
  add constraint evaluations_creativity_innovation_check
    check (creativity_innovation between 0 and 5 and creativity_innovation * 2 = trunc(creativity_innovation * 2)),
  add constraint evaluations_technical_quality_check
    check (technical_quality between 0 and 5 and technical_quality * 2 = trunc(technical_quality * 2)),
  add constraint evaluations_theme_adequacy_check
    check (theme_adequacy between 0 and 5 and theme_adequacy * 2 = trunc(theme_adequacy * 2)),
  add constraint evaluations_inclusion_diversity_accessibility_check
    check (inclusion_diversity_accessibility between 0 and 5
      and inclusion_diversity_accessibility * 2 = trunc(inclusion_diversity_accessibility * 2)),
  add constraint evaluations_gameplay_fun_check
    check (gameplay_fun between 0 and 5 and gameplay_fun * 2 = trunc(gameplay_fun * 2)),
  add constraint evaluations_art_sound_originality_check
    check (art_sound_originality between 0 and 5 and art_sound_originality * 2 = trunc(art_sound_originality * 2));

-- Placar público. Roda com os privilégios do dono para agregar as avaliações
-- sem expor as linhas individuais.
-- Média de estrelas de cada critério convertida em pontos (estrelas / 5 * peso).
-- Nota final = soma dos pontos de cada critério (0 a 100).
-- Desempate: pontos por critério na ordem abaixo, depois nome do time.
create view public.team_results
with (security_invoker = false)
as
with averages as (
  select
    t.id as team_id,
    t.name as team_name,
    t.game_title,
    count(e.id)::integer as evaluation_count,
    (coalesce(avg(e.creativity_innovation), 0) * 15 / 5)::double precision as creativity_innovation,
    (coalesce(avg(e.technical_quality), 0) * 15 / 5)::double precision as technical_quality,
    (coalesce(avg(e.theme_adequacy), 0) * 20 / 5)::double precision as theme_adequacy,
    (coalesce(avg(e.inclusion_diversity_accessibility), 0) * 20 / 5)::double precision as inclusion_diversity_accessibility,
    (coalesce(avg(e.gameplay_fun), 0) * 15 / 5)::double precision as gameplay_fun,
    (coalesce(avg(e.art_sound_originality), 0) * 15 / 5)::double precision as art_sound_originality
  from public.teams t
  left join public.evaluations e on e.team_id = t.id and e.valid
  group by t.id
),
scored as (
  select
    a.*,
    a.creativity_innovation + a.technical_quality + a.theme_adequacy
      + a.inclusion_diversity_accessibility + a.gameplay_fun + a.art_sound_originality as final_score
  from averages a
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
  s.*
from scored s;

revoke all on public.team_results from anon, authenticated;
grant select on public.team_results to anon, authenticated;

-- Registra a avaliação de um time. Erros de negócio saem como exceção P0001
-- com a mensagem para a usuária.
-- p_scores: { "creativityInnovation": 0 a 5 (passo 0,5), "technicalQuality": ..., ... }
create or replace function public.submit_evaluation(p_cpf text, p_ip text, p_team_id uuid, p_scores jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_reason text;
  v_id uuid;
begin
  if jsonb_typeof(p_scores) is distinct from 'object' then
    raise exception 'Notas inválidas. Confira os valores de cada critério.';
  end if;

  -- Serializa envios concorrentes do mesmo CPF/IP.
  perform pg_advisory_xact_lock(hashtext('vote-cpf:' || p_cpf));
  if p_ip is not null then
    perform pg_advisory_xact_lock(hashtext('vote-ip:' || p_ip));
  end if;

  v_reason := public.check_voter(p_cpf, p_ip, p_team_id);
  if v_reason is not null then
    raise exception '%', v_reason;
  end if;

  begin
    insert into public.evaluations (
      cpf, ip, team_id,
      creativity_innovation, technical_quality, theme_adequacy,
      inclusion_diversity_accessibility, gameplay_fun, art_sound_originality
    )
    select
      p_cpf, p_ip, p_team_id,
      x."creativityInnovation", x."technicalQuality", x."themeAdequacy",
      x."inclusionDiversityAccessibility", x."gameplayFun", x."artSoundOriginality"
    from jsonb_to_record(p_scores) as x(
      "creativityInnovation" numeric,
      "technicalQuality" numeric,
      "themeAdequacy" numeric,
      "inclusionDiversityAccessibility" numeric,
      "gameplayFun" numeric,
      "artSoundOriginality" numeric
    )
    returning id into v_id;
  exception
    when check_violation or not_null_violation
      or invalid_text_representation or numeric_value_out_of_range then
      raise exception 'Notas inválidas. Confira os valores de cada critério.';
  end;

  return v_id;
end;
$$;
