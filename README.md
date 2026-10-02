# GameJam Delas · Avaliador

- `frontend/gamejam-avaliador`: app React (Vite) que fala direto com o Supabase.
- `supabase/`: banco (migrations, RLS, placar), Edge Functions de votação e testes.

## Como o backend funciona

| O quê | Onde |
|---|---|
| Times, configuração do evento, placar | Tabelas/view lidas direto pelo `supabase-js`; escrita só para admins (RLS) |
| Eleitoras e avaliações | Visíveis só para admins |
| Checar CPF e registrar a avaliação de um time | Edge Functions `check-voter` e `submit-vote` (públicas). Usam `submit_evaluation()`, que valida e grava numa transação |
| Login do painel | Supabase Auth (e-mail e senha) + tabela `admins` |

## QR code de cada time

Em **Admin > QR codes** cada time ganha um QR que abre `/votar?time=<id>`, direto na avaliação daquele time
(dá para baixar o PNG ou imprimir todos). Cada CPF avalia cada time uma única vez, mas pode avaliar vários times.
Gere os QR codes pelo endereço final do site: o link usa o endereço em que o painel está aberto.

## Setup

1. Instale a [Supabase CLI](https://supabase.com/docs/guides/cli) e vincule o projeto:
   ```sh
   supabase login
   supabase link --project-ref <project-ref>
   ```
2. Suba o banco e as funções:
   ```sh
   supabase db push
   supabase functions deploy check-voter --no-verify-jwt
   supabase functions deploy submit-vote --no-verify-jwt
   ```
3. Crie a conta de admin em **Authentication > Users > Add user** e libere o acesso dela no SQL Editor:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'organizacao@exemplo.com';
   ```
   Em **Authentication > Sign In / Providers**, desligue *Allow new users to sign up*.
4. Configure o frontend:
   ```sh
   cd frontend/gamejam-avaliador
   cp .env.example .env.local   # preencha URL e publishable key
   npm install
   npm run dev
   ```

## Desenvolvimento local

Com Docker rodando: `supabase start` sobe tudo localmente (com os times de `supabase/seed.sql`),
`supabase functions serve` serve as funções e `supabase test db` roda os testes em `supabase/tests`.
