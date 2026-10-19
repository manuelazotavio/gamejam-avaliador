begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(17);

delete from public.teams;

insert into public.voters (cpf, name) values
  ('00000000001', 'Ana'),
  ('00000000002', 'Bia'),
  ('00000000003', 'Carla'),
  ('00000000004', 'Duda');

insert into public.teams (id, name, game_title) values
  ('11111111-1111-1111-1111-111111111111', 'Pixel Bruxas', 'Encanto de Bytes'),
  ('22222222-2222-2222-2222-222222222222', 'Byte Me', 'Overclock'),
  ('33333333-3333-3333-3333-333333333333', 'Garotas Glitch', 'Falha Fatal'),
  ('44444444-4444-4444-4444-444444444444', 'Sem Votos', 'Jogo Fantasma');

create function pg_temp.scores(c numeric, t numeric, th numeric, i numeric, g numeric, a numeric)
returns jsonb language sql as $$
  select jsonb_build_object(
    'creativityInnovation', c, 'technicalQuality', t, 'themeAdequacy', th,
    'inclusionDiversityAccessibility', i, 'gameplayFun', g, 'artSoundOriginality', a)
$$;

-- Estrelas (0 a 5) viram pontos pelo peso do critério; nota final é a soma.
select lives_ok(
  $$ select public.submit_evaluation('00000000001', '10.0.0.1', '11111111-1111-1111-1111-111111111111',
       pg_temp.scores(3.5, 3.5, 3.5, 3.5, 3.5, 3.5)) $$,
  'eleitora autorizada avalia um time'
);
select public.submit_evaluation('00000000002', '10.0.0.5', '11111111-1111-1111-1111-111111111111',
  pg_temp.scores(5, 5, 5, 5, 5, 5));

select is(
  (select final_score from public.team_results where team_name = 'Pixel Bruxas'),
  85::double precision,
  'nota final é a média das avaliações (70 e 100 -> 85)'
);
select is(
  (select evaluation_count from public.team_results where team_name = 'Pixel Bruxas'),
  2,
  'conta as avaliações do time'
);

-- A mesma eleitora avalia outro time depois.
select lives_ok(
  $$ select public.submit_evaluation('00000000001', '10.0.0.1', '22222222-2222-2222-2222-222222222222',
       pg_temp.scores(5, 0, 0, 0, 0, 0)) $$,
  'a mesma eleitora avalia outro time'
);

-- Empate em 15 pontos resolvido pela criatividade: Byte Me (5★, 0...) x Garotas Glitch (0, 5★...).
select public.submit_evaluation('00000000003', null, '33333333-3333-3333-3333-333333333333',
  pg_temp.scores(0, 5, 0, 0, 0, 0));

select results_eq(
  $$ select team_name, rank from public.team_results order by rank $$,
  $$ values ('Pixel Bruxas'::text, 1), ('Byte Me', 2), ('Garotas Glitch', 3), ('Sem Votos', 4) $$,
  'ranking usa a criatividade como primeiro desempate e time sem votos fica por último'
);
select is(
  (select final_score from public.team_results where team_name = 'Sem Votos'),
  0::double precision,
  'time sem avaliações tem nota zero'
);

select throws_ok(
  $$ select public.submit_evaluation('00000000004', null, '44444444-4444-4444-4444-444444444444',
       pg_temp.scores(3.3, 0, 0, 0, 0, 0)) $$,
  'P0001', 'Notas inválidas. Confira os valores de cada critério.',
  'nota fora do passo de meia estrela é rejeitada'
);

-- Regras de elegibilidade.
select throws_ok(
  $$ select public.submit_evaluation('00000000001', '10.0.0.9', '11111111-1111-1111-1111-111111111111',
       pg_temp.scores(0, 0, 0, 0, 0, 0)) $$,
  'P0001', 'Você já avaliou este time.',
  'eleitora não avalia o mesmo time duas vezes'
);
select throws_ok(
  $$ select public.submit_evaluation('99999999999', null, '11111111-1111-1111-1111-111111111111',
       pg_temp.scores(0, 0, 0, 0, 0, 0)) $$,
  'P0001', 'Este CPF não está na lista de eleitores autorizados do evento.',
  'CPF fora da lista não vota'
);
select throws_ok(
  $$ select public.submit_evaluation('00000000004', null, '55555555-5555-5555-5555-555555555555',
       pg_temp.scores(0, 0, 0, 0, 0, 0)) $$,
  'P0001', 'Time não encontrado.',
  'time inexistente é rejeitado'
);
select throws_ok(
  $$ select public.submit_evaluation('00000000004', null, '11111111-1111-1111-1111-111111111111',
       pg_temp.scores(5.5, 0, 0, 0, 0, 0)) $$,
  'P0001', 'Notas inválidas. Confira os valores de cada critério.',
  'nota acima do máximo é rejeitada'
);
select is(
  (select count(*) from public.evaluations where cpf = '00000000004'),
  0::bigint,
  'avaliação rejeitada não deixa rastro'
);

update public.event_config set one_vote_per_ip = true;
select is(
  public.check_voter('00000000004', '10.0.0.1', '44444444-4444-4444-4444-444444444444'),
  'Já existe um voto registrado a partir deste dispositivo/rede.',
  'com one_vote_per_ip, IP usado por outro CPF é bloqueado'
);
select is(
  public.check_voter('00000000001', '10.0.0.1', '33333333-3333-3333-3333-333333333333'),
  null,
  'com one_vote_per_ip, o mesmo CPF segue avaliando outros times pelo mesmo IP'
);

select is(
  public.check_voter('00000000099', null, '11111111-1111-1111-1111-111111111111'),
  'Este CPF não está na lista de eleitores autorizados do evento.',
  'com voters_only, CPF fora da lista é bloqueado'
);

update public.event_config set voters_only = false;
select is(
  public.check_voter('00000000099', null, '11111111-1111-1111-1111-111111111111'),
  null,
  'sem voters_only, CPF fora da lista pode avaliar'
);

update public.event_config set voting_open = false;
select is(
  public.check_voter('00000000004', null, '11111111-1111-1111-1111-111111111111'),
  'A votação está encerrada no momento.',
  'votação fechada bloqueia'
);

select * from finish();
rollback;
