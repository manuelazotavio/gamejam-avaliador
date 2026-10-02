-- Avaliação por time (QR code de cada time).
-- Antes: um voto por CPF com todos os times. Agora: uma avaliação por CPF e time.
-- A tabela votes deixa de existir; CPF e IP passam a ficar em evaluations.

alter table public.evaluations
  add column cpf text,
  add column ip text;

update public.evaluations e
set cpf = v.cpf, ip = v.ip
from public.votes v
where v.id = e.vote_id;

alter table public.evaluations
  alter column cpf set not null,
  add constraint evaluations_cpf_format check (cpf ~ '^\d{11}$');

drop view public.voter_status;
drop function public.register_vote(text, text, jsonb);
drop function public.check_voter(text, text);

-- Remove também a FK e a unicidade (vote_id, team_id).
alter table public.evaluations drop column vote_id;
drop table public.votes;

alter table public.evaluations
  add constraint evaluations_cpf_team_key unique (cpf, team_id);

create index evaluations_ip_idx on public.evaluations (ip);

-- Situação de cada eleitora (somente admins, pois respeita o RLS).
create view public.voter_status
with (security_invoker = true)
as
select
  v.cpf,
  v.name,
  v.imported,
  count(e.id)::integer as evaluation_count,
  min(e.created_at) as first_voted_at,
  max(e.ip) as ip
from public.voters v
left join public.evaluations e on e.cpf = v.cpf
group by v.cpf;

-- ---------------------------------------------------------------------------
-- Votação (chamadas somente pela Edge Function, com service_role)
-- ---------------------------------------------------------------------------

-- Retorna o motivo pelo qual a eleitora não pode avaliar o time, ou null se pode.
create function public.check_voter(p_cpf text, p_ip text, p_team_id uuid)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_config public.event_config;
begin
  select * into v_config from public.event_config where id = 1;

  if not coalesce(v_config.voting_open, false) then
    return 'A votação está encerrada no momento.';
  end if;

  if not exists (select 1 from public.voters where cpf = p_cpf) then
    return 'Este CPF não está na lista de eleitores autorizados do evento.';
  end if;

  if not exists (select 1 from public.teams where id = p_team_id) then
    return 'Time não encontrado.';
  end if;

  if exists (select 1 from public.evaluations where cpf = p_cpf and team_id = p_team_id) then
    return 'Você já avaliou este time.';
  end if;

  -- Outro CPF já votou por este IP (o mesmo CPF pode avaliar vários times).
  if v_config.one_vote_per_ip and p_ip is not null
     and exists (select 1 from public.evaluations where ip = p_ip and cpf <> p_cpf) then
    return 'Já existe um voto registrado a partir deste dispositivo/rede.';
  end if;

  return null;
end;
$$;

-- Registra a avaliação de um time. Erros de negócio saem como exceção P0001
-- com a mensagem para a usuária.
-- p_scores: { "creativityInnovation": int, "technicalQuality": int, ... }
create function public.submit_evaluation(p_cpf text, p_ip text, p_team_id uuid, p_scores jsonb)
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
      "creativityInnovation" integer,
      "technicalQuality" integer,
      "themeAdequacy" integer,
      "inclusionDiversityAccessibility" integer,
      "gameplayFun" integer,
      "artSoundOriginality" integer
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

revoke execute on function public.check_voter(text, text, uuid) from public, anon, authenticated;
revoke execute on function public.submit_evaluation(text, text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.check_voter(text, text, uuid) to service_role;
grant execute on function public.submit_evaluation(text, text, uuid, jsonb) to service_role;
