// Verifica se um CPF pode avaliar um time. Sempre responde 200 com { ok, reason }.

import { isValidCpf, stripCpf } from '../_shared/cpf.ts'
import { adminClient, clientIp, errorResponse, isUuid, json, readPost } from '../_shared/http.ts'

Deno.serve(async (req) => {
  const body = await readPost<{ cpf?: unknown; teamId?: unknown; deviceId?: unknown }>(req)
  if (body instanceof Response) return body

  const cpf = stripCpf(String(body.cpf ?? ''))
  if (!isValidCpf(cpf)) return json({ ok: false, reason: 'CPF inválido.' })
  if (!isUuid(body.teamId)) return json({ ok: false, reason: 'Time não encontrado.' })

  const { data: reason, error } = await adminClient().rpc('check_voter', {
    p_cpf: cpf,
    p_ip: clientIp(req),
    p_team_id: body.teamId,
    p_device_id: isUuid(body.deviceId) ? body.deviceId.toLowerCase() : null,
  })
  if (error) {
    console.error('check_voter failed', error)
    return errorResponse('Não foi possível verificar o CPF agora.', 500)
  }

  return json({ ok: reason === null, reason })
})
