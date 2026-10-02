// Mesma validação de frontend/gamejam-avaliador/src/lib/cpf.ts.

export function stripCpf(value: string): string {
  return value.replace(/\D/g, '')
}

export function isValidCpf(value: string): boolean {
  const cpf = stripCpf(value)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false

  const digits = cpf.split('').map(Number)

  const checkDigit = (length: number): number => {
    let sum = 0
    for (let i = 0; i < length; i++) {
      sum += digits[i] * (length + 1 - i)
    }
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }

  return checkDigit(9) === digits[9] && checkDigit(10) === digits[10]
}
