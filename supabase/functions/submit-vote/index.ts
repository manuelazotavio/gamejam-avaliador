// Registra a avaliação de uma eleitora para um time.
// A validação e a gravação acontecem numa única transação em submit_evaluation().

import { isValidCpf, stripCpf } from '../_shared/cpf.ts'
import { adminClient, clientIp, errorResponse, isUuid, json, readPost } from '../_shared/http.ts'

interface SubmitVoteBody {
  cpf?: unknown
  teamId?: unknown
  scores?: unknown
  deviceId?: unknown
}

Deno.serve(async (req) => {
  const body = await readPost<SubmitVoteBody>(req)
  if (body instanceof Response) return body

  const cpf = stripCpf(String(body.cpf ?? ''))
  if (!isValidCpf(cpf)) return errorResponse('CPF inválido.', 400)
  if (!isUuid(body.teamId)) return errorResponse('Time não encontrado.', 400)
  if (typeof body.scores !== 'object' || body.scores === null || Array.isArray(body.scores)) {
    return errorResponse('Notas inválidas. Confira os valores de cada critério.', 400)
  }

  const { data: id, error } = await adminClient().rpc('submit_evaluation', {
    p_cpf: cpf,
    p_ip: clientIp(req),
    p_team_id: body.teamId,
    p_scores: body.scores,
    p_device_id: isUuid(body.deviceId) ? body.deviceId.toLowerCase() : null,
  })

  if (error) {
    // P0001 = raise exception em submit_evaluation: mensagem já é para a usuária.
    if (error.code === 'P0001') return errorResponse(error.message, 409)
    console.error('submit_evaluation failed', error)
    return errorResponse('Não foi possível registrar a avaliação agora.', 500)
  }

  return json({ id }, 201)
})
