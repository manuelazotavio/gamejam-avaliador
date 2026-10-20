-- Júri e voto popular.
-- O júri fica na mesma lista de CPFs (voters), com role = 'jury'. Cada avaliação
-- guarda de quem veio (kind), decidido no servidor pela role do CPF.
-- Nota do júri: média de estrelas por critério convertida pelos pesos (0 a 100).
-- Nota popular: média simples das estrelas dos 6 critérios, sem peso (0 a 100).
-- Nota final: júri * jury_weight% + popular * (100 - jury_weight)%.

alter table public.voters
  add column role text not null default 'popular' check (role in ('popular', 'jury'));

alter table public.evaluations
  add column kind text not null default 'popular' check (kind in ('popular', 'jury'));

alter table public.event_config
  add column jury_weight integer not null default 70 check (jury_weight between 0 and 100);

-- Situação de cada CPF cadastrado (somente admins, pois respeita o RLS).
drop view public.voter_status;
create view public.voter_status
with (security_invoker = true)
as
select
  v.cpf,
  v.name,
  v.imported,
  v.role,
  count(e.id)::integer as evaluation_count,
  min(e.created_at) as first_voted_at,
  max(e.ip) as ip
from public.voters v
left join public.evaluations e on e.cpf = v.cpf
group by v.cpf;

-- Papel do CPF na votação: 'jury' para quem está no júri, 'popular' para os demais.
create function public.voter_role(p_cpf text)
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce((select role from public.voters where cpf = p_cpf), 'popular')
$$;

revoke execute on function public.voter_role(text) from public, anon, authenticated;
grant execute on function public.voter_role(text) to service_role;

-- Placar público. Roda com os privilégios do dono para agregar as avaliações
-- sem expor as linhas individuais.
-- As colunas por critério são os pontos do júri (estrelas / 5 * peso).
-- Desempate: nota final, nota do júri, pontos por critério na ordem abaixo, nome do time.
drop view public.team_results;
create view public.team_results
with (security_invoker = false)
as
with config as (
  select jury_weight from public.event_config where id = 1
),
jury as (
  select
    t.id as team_id,
    count(e.id)::integer as jury_count,
    (coalesce(avg(e.creativity_innovation), 0) * 15 / 5)::double precision as creativity_innovation,
    (coalesce(avg(e.technical_quality), 0) * 15 / 5)::double precision as technical_quality,
    (coalesce(avg(e.theme_adequacy), 0) * 20 / 5)::double precision as theme_adequacy,
    (coalesce(avg(e.inclusion_diversity_accessibility), 0) * 20 / 5)::double precision as inclusion_diversity_accessibility,
    (coalesce(avg(e.gameplay_fun), 0) * 15 / 5)::double precision as gameplay_fun,
    (coalesce(avg(e.art_sound_originality), 0) * 15 / 5)::double precision as art_sound_originality
  from public.teams t
  left join public.evaluations e on e.team_id = t.id and e.valid and e.kind = 'jury'
  group by t.id
),
popular as (
  select
    t.id as team_id,
    count(e.id)::integer as popular_count,
    -- Média das estrelas dos 6 critérios (0 a 5) levada para 0 a 100.
    (coalesce(avg(
      (e.creativity_innovation + e.technical_quality + e.theme_adequacy
        + e.inclusion_diversity_accessibility + e.gameplay_fun + e.art_sound_originality) / 6
    ), 0) * 100 / 5)::double precision as popular_score
  from public.teams t
  left join public.evaluations e on e.team_id = t.id and e.valid and e.kind = 'popular'
  group by t.id
),
scored as (
  select
    t.id as team_id,
    t.name as team_name,
    t.game_title,
    j.jury_count + p.popular_count as evaluation_count,
    j.jury_count,
    p.popular_count,
    j.creativity_innovation,
    j.technical_quality,
    j.theme_adequacy,
    j.inclusion_diversity_accessibility,
    j.gameplay_fun,
    j.art_sound_originality,
    j.creativity_innovation + j.technical_quality + j.theme_adequacy
      + j.inclusion_diversity_accessibility + j.gameplay_fun + j.art_sound_originality as jury_score,
    p.popular_score
  from public.teams t
  join jury j on j.team_id = t.id
  join popular p on p.team_id = t.id
),
final as (
  select
    s.*,
    (s.jury_score * c.jury_weight + s.popular_score * (100 - c.jury_weight)) / 100 as final_score
  from scored s
  cross join config c
)
select
  row_number() over (
    order by
      final_score desc,
      jury_score desc,
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

-- Registra a avaliação de um time. Erros de negócio saem como exceção P0001
-- com a mensagem para a usuária.
-- p_scores: { "creativityInnovation": 0 a 5 (passo 0,5), "technicalQuality": ..., ... }
create or replace function public.submit_evaluation(
  p_cpf text, p_ip text, p_team_id uuid, p_scores jsonb, p_device_id text default null
)
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

  -- Serializa envios concorrentes do mesmo CPF/IP/aparelho.
  perform pg_advisory_xact_lock(hashtext('vote-cpf:' || p_cpf));
  if p_ip is not null then
    perform pg_advisory_xact_lock(hashtext('vote-ip:' || p_ip));
  end if;
  if p_device_id is not null then
    perform pg_advisory_xact_lock(hashtext('vote-device:' || p_device_id));
  end if;

  v_reason := public.check_voter(p_cpf, p_ip, p_team_id, p_device_id);
  if v_reason is not null then
    raise exception '%', v_reason;
  end if;

  begin
    insert into public.evaluations (
      cpf, ip, device_id, team_id, kind,
      creativity_innovation, technical_quality, theme_adequacy,
      inclusion_diversity_accessibility, gameplay_fun, art_sound_originality
    )
    select
      p_cpf, p_ip, p_device_id, p_team_id, public.voter_role(p_cpf),
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
