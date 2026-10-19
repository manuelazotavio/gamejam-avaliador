-- Interruptores do painel admin:
-- require_location: exige que a eleitora esteja no raio do evento (verificado no navegador).
-- voters_only: só CPFs importados na lista de eleitoras podem avaliar.
alter table public.event_config
  add column require_location boolean not null default true,
  add column voters_only boolean not null default true;

-- Retorna o motivo pelo qual a eleitora não pode avaliar o time, ou null se pode.
create or replace function public.check_voter(p_cpf text, p_ip text, p_team_id uuid)
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

  -- Outro CPF já votou por este IP (o mesmo CPF pode avaliar vários times).
  if v_config.one_vote_per_ip and p_ip is not null
     and exists (select 1 from public.evaluations where ip = p_ip and cpf <> p_cpf) then
    return 'Já existe um voto registrado a partir deste dispositivo/rede.';
  end if;

  return null;
end;
$$;
