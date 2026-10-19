-- Trava por dispositivo: cada navegador manda um identificador aleatório
-- (guardado no localStorage) e, com one_vote_per_device ligado, um aparelho
-- que já votou com um CPF não vota com outro. Não é infalível (aba anônima
-- gera outro id), mas barra a troca de CPF no mesmo celular.

alter table public.event_config
  add column one_vote_per_device boolean not null default true;

alter table public.evaluations
  add column device_id text check (device_id is null or device_id ~ '^[0-9a-f-]{36}$');

create index evaluations_device_id_idx on public.evaluations (device_id);

-- p_device_id entra por último e com default: versões antigas das Edge Functions
-- seguem funcionando (sem a trava) até serem publicadas de novo.
drop function public.submit_evaluation(text, text, uuid, jsonb);
drop function public.check_voter(text, text, uuid);

-- Retorna o motivo pelo qual a eleitora não pode avaliar o time, ou null se pode.
create function public.check_voter(p_cpf text, p_ip text, p_team_id uuid, p_device_id text default null)
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

  if coalesce(v_config.voters_only, true)
     and not exists (select 1 from public.voters where cpf = p_cpf) then
    return 'Este CPF não está na lista de eleitores autorizados do evento.';
  end if;

  if not exists (select 1 from public.teams where id = p_team_id) then
    return 'Time não encontrado.';
  end if;

  if exists (select 1 from public.evaluations where cpf = p_cpf and team_id = p_team_id) then
    return 'Você já avaliou este time.';
  end if;

  -- Outro CPF já votou por este aparelho (o mesmo CPF pode avaliar vários times).
  if v_config.one_vote_per_device and p_device_id is not null
     and exists (select 1 from public.evaluations where device_id = p_device_id and cpf <> p_cpf) then
    return 'Este aparelho já foi usado para votar com outro CPF.';
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
-- p_scores: { "creativityInnovation": 0 a 5 (passo 0,5), "technicalQuality": ..., ... }
create function public.submit_evaluation(
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
      cpf, ip, device_id, team_id,
      creativity_innovation, technical_quality, theme_adequacy,
      inclusion_diversity_accessibility, gameplay_fun, art_sound_originality
    )
    select
      p_cpf, p_ip, p_device_id, p_team_id,
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

revoke execute on function public.check_voter(text, text, uuid, text) from public, anon, authenticated;
revoke execute on function public.submit_evaluation(text, text, uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.check_voter(text, text, uuid, text) to service_role;
grant execute on function public.submit_evaluation(text, text, uuid, jsonb, text) to service_role;
