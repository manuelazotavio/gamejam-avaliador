-- Resultados privados: com results_private ligado, o placar público
-- (team_results) não devolve linhas para quem não é admin. O júri vê o placar
-- pela Edge Function jury-results, que confere o papel do CPF no servidor.

alter table public.event_config
  add column results_private boolean not null default false;

-- O placar com penalidades vira team_ranking (interno); team_results passa a
-- respeitar o interruptor.
alter view public.team_results rename to team_ranking;
revoke all on public.team_ranking from anon, authenticated;

create view public.team_results
with (security_invoker = false)
as
select r.*
from public.team_ranking r
where not coalesce((select results_private from public.event_config where id = 1), false)
   or (select public.is_admin());

revoke all on public.team_results from anon, authenticated;
grant select on public.team_results to anon, authenticated;
