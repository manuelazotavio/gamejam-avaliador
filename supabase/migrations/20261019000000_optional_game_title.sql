-- O nome do jogo passa a ser opcional: times podem ser cadastrados antes de
-- definirem o jogo. Vazio é gravado como null.
alter table public.teams
  alter column game_title drop not null,
  drop constraint teams_game_title_check,
  add constraint teams_game_title_check check (game_title is null or btrim(game_title) <> '');
