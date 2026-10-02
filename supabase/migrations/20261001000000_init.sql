-- Esquema do avaliador da GameJam Delas.
-- Leitura pública: times, configuração do evento e placar (team_results).
-- Escrita de times/eleitoras/configuração: somente admins (tabela admins).
-- Votos e avaliações: somente via Edge Function submit-vote (service_role) -> register_vote().

-- ---------------------------------------------------------------------------
-- Admins
-- ---------------------------------------------------------------------------

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

alter table public.admins enable row level security;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
$$;

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  game_title text not null check (btrim(game_title) <> ''),
  created_at timestamptz not null default now()
);

create table public.event_config (
  id smallint primary key default 1 check (id = 1),
  event_name text not null,
  latitude double precision not null,
  longitude double precision not null,
  radius_meters integer not null check (radius_meters > 0),
  voting_open boolean not null default true,
  -- Bloqueia um segundo voto vindo do mesmo IP público. Desligado por padrão:
  -- no evento, todo mundo no Wi-Fi do local costuma sair pelo mesmo IP.
  one_vote_per_ip boolean not null default false
);

insert into public.event_config (event_name, latitude, longitude, radius_meters)
values ('GameJam Delas', -23.5505, -46.6333, 300);

create table public.voters (
  cpf text primary key check (cpf ~ '^\d{11}$'),
  name text not null,
  imported boolean not null default true,
  created_at timestamptz not null default now()
);

-- Sem FK para voters: remover uma eleitora da lista não apaga o voto já dado.
create table public.votes (
  id uuid primary key default gen_random_uuid(),
  cpf text not null unique,
  ip text,
  created_at timestamptz not null default now()
);

create index votes_ip_idx on public.votes (ip);

create table public.evaluations (
  id uuid primary key default gen_random_uuid(),
  vote_id uuid not null references public.votes (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  creativity_innovation integer not null check (creativity_innovation between 0 and 15),
  technical_quality integer not null check (technical_quality between 0 and 15),
  theme_adequacy integer not null check (theme_adequacy between 0 and 20),
  inclusion_diversity_accessibility integer not null check (inclusion_diversity_accessibility between 0 and 20),
  gameplay_fun integer not null check (gameplay_fun between 0 and 15),
  art_sound_originality integer not null check (art_sound_originality between 0 and 15),
  valid boolean not null default true,
  created_at timestamptz not null default now(),
  unique (vote_id, team_id)
);

create index evaluations_team_id_idx on public.evaluations (team_id) where valid;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.teams enable row level security;
alter table public.event_config enable row level security;
alter table public.voters enable row level security;
alter table public.votes enable row level security;
alter table public.evaluations enable row level security;

create policy "times são públicos" on public.teams
  for select to anon, authenticated using (true);
create policy "admins gerenciam times" on public.teams
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "configuração é pública" on public.event_config
  for select to anon, authenticated using (true);
create policy "admins alteram configuração" on public.event_config
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "admins gerenciam eleitoras" on public.voters
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "admins leem votos" on public.votes
  for select to authenticated using ((select public.is_admin()));

create policy "admins leem avaliações" on public.evaluations
  for select to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------

-- Situação de cada eleitora (somente admins, pois respeita o RLS de voters/votes).
create view public.voter_status
with (security_invoker = true)
as
select
  v.cpf,
  v.name,
  v.imported,
  vo.id is not null as has_voted,
  vo.created_at as voted_at,
  vo.ip
from public.voters v
left join public.votes vo on vo.cpf = v.cpf;

-- Placar público. Roda com os privilégios do dono para agregar as avaliações
-- sem expor as linhas individuais.
-- Nota final = soma das médias de cada critério (0 a 100).
-- Desempate: médias por critério na ordem abaixo, depois nome do time.
create view public.team_results
with (security_invoker = false)
as
with averages as (
  select
    t.id as team_id,
    t.name as team_name,
    t.game_title,
    count(e.id)::integer as evaluation_count,
    coalesce(avg(e.creativity_innovation), 0)::double precision as creativity_innovation,
    coalesce(avg(e.technical_quality), 0)::double precision as technical_quality,
    coalesce(avg(e.theme_adequacy), 0)::double precision as theme_adequacy,
    coalesce(avg(e.inclusion_diversity_accessibility), 0)::double precision as inclusion_diversity_accessibility,
    coalesce(avg(e.gameplay_fun), 0)::double precision as gameplay_fun,
    coalesce(avg(e.art_sound_originality), 0)::double precision as art_sound_originality
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

-- ---------------------------------------------------------------------------
-- Votação (chamadas somente pela Edge Function, com service_role)
-- ---------------------------------------------------------------------------

-- Retorna o motivo pelo qual a eleitora não pode votar, ou null se pode.
create function public.check_voter(p_cpf text, p_ip text)
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

  if exists (select 1 from public.votes where cpf = p_cpf) then
    return 'Este CPF já registrou um voto.';
  end if;

  if v_config.one_vote_per_ip and p_ip is not null
     and exists (select 1 from public.votes where ip = p_ip) then
    return 'Já existe um voto registrado a partir deste dispositivo/rede.';
  end if;

  return null;
end;
$$;

-- Registra o voto e as avaliações de uma vez. Erros de negócio saem como
-- exceção P0001 com a mensagem para a usuária.
-- p_evaluations: [{ "teamId": uuid, "creativityInnovation": int, ... }]
create function public.register_vote(p_cpf text, p_ip text, p_evaluations jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_reason text;
  v_vote_id uuid;
begin
  if jsonb_typeof(p_evaluations) is distinct from 'array' or jsonb_array_length(p_evaluations) = 0 then
    raise exception 'Nenhuma avaliação enviada.';
  end if;

  -- Serializa votos concorrentes do mesmo CPF/IP.
  perform pg_advisory_xact_lock(hashtext('vote-cpf:' || p_cpf));
  if p_ip is not null then
    perform pg_advisory_xact_lock(hashtext('vote-ip:' || p_ip));
  end if;

  v_reason := public.check_voter(p_cpf, p_ip);
  if v_reason is not null then
    raise exception '%', v_reason;
  end if;

  insert into public.votes (cpf, ip) values (p_cpf, p_ip) returning id into v_vote_id;

  begin
    insert into public.evaluations (
      vote_id, team_id,
      creativity_innovation, technical_quality, theme_adequacy,
      inclusion_diversity_accessibility, gameplay_fun, art_sound_originality
    )
    select
      v_vote_id, x."teamId",
      x."creativityInnovation", x."technicalQuality", x."themeAdequacy",
      x."inclusionDiversityAccessibility", x."gameplayFun", x."artSoundOriginality"
    from jsonb_to_recordset(p_evaluations) as x(
      "teamId" uuid,
      "creativityInnovation" integer,
      "technicalQuality" integer,
      "themeAdequacy" integer,
      "inclusionDiversityAccessibility" integer,
      "gameplayFun" integer,
      "artSoundOriginality" integer
    );
  exception
    when foreign_key_violation then
      raise exception 'Um dos times avaliados não existe mais. Recarregue a página e tente novamente.';
    when unique_violation then
      raise exception 'O mesmo time foi avaliado mais de uma vez.';
    when check_violation or not_null_violation or invalid_text_representation then
      raise exception 'Notas inválidas. Confira os valores de cada critério.';
  end;

  return v_vote_id;
end;
$$;

revoke execute on function public.check_voter(text, text) from public, anon, authenticated;
revoke execute on function public.register_vote(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.check_voter(text, text) to service_role;
grant execute on function public.register_vote(text, text, jsonb) to service_role;
