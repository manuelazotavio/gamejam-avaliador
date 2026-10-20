// Verifica se um CPF pode avaliar um time. Sempre responde 200 com { ok, reason, role }.

import { isValidCpf, stripCpf } from '../_shared/cpf.ts'
import { adminClient, clientIp, errorResponse, isUuid, json, readPost } from '../_shared/http.ts'

Deno.serve(async (req) => {
  const body = await readPost<{ cpf?: unknown; teamId?: unknown; deviceId?: unknown }>(req)
  if (body instanceof Response) return body

  const cpf = stripCpf(String(body.cpf ?? ''))
  if (!isValidCpf(cpf)) return json({ ok: false, reason: 'CPF inválido.' })
  if (!isUuid(body.teamId)) return json({ ok: false, reason: 'Time não encontrado.' })

  const client = adminClient()
  const [check, role] = await Promise.all([
    client.rpc('check_voter', {
      p_cpf: cpf,
      p_ip: clientIp(req),
      p_team_id: body.teamId,
      p_device_id: isUuid(body.deviceId) ? body.deviceId.toLowerCase() : null,
    }),
    client.rpc('voter_role', { p_cpf: cpf }),
  ])
  const error = check.error ?? role.error
  if (error) {
    console.error('check_voter failed', error)
    return errorResponse('Não foi possível verificar o CPF agora.', 500)
  }

  // role: 'jury' avalia com os pesos dos critérios; 'popular' entra na média do público.
  return json({ ok: check.data === null, reason: check.data, role: role.data })
})
