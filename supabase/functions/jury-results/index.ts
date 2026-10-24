// Placar para o júri quando os resultados estão privados.
// Responde 200 com { rows } se o CPF é do júri; 403 caso contrário.

import { isValidCpf, stripCpf } from '../_shared/cpf.ts'
import { adminClient, errorResponse, json, readPost } from '../_shared/http.ts'

Deno.serve(async (req) => {
  const body = await readPost<{ cpf?: unknown }>(req)
  if (body instanceof Response) return body

  const cpf = stripCpf(String(body.cpf ?? ''))
  if (!isValidCpf(cpf)) return errorResponse('CPF inválido.', 400)

  const client = adminClient()
  const role = await client.rpc('voter_role', { p_cpf: cpf })
  if (role.error) {
    console.error('voter_role failed', role.error)
    return errorResponse('Não foi possível carregar os resultados agora.', 500)
  }
  if (role.data !== 'jury') return errorResponse('Os resultados estão disponíveis apenas para o júri.', 403)

  // team_ranking não é exposta ao público; o service_role lê direto.
  const { data: rows, error } = await client.from('team_ranking').select('*').order('rank')
  if (error) {
    console.error('team_ranking failed', error)
    return errorResponse('Não foi possível carregar os resultados agora.', 500)
  }

  return json({ rows })
})
