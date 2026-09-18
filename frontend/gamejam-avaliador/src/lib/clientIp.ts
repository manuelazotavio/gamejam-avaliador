const DEVICE_ID_KEY = 'gamejam.deviceId'

function getDeviceFallbackId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = `device-${crypto.randomUUID()}`
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

export async function getClientIp(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json')
    if (!response.ok) throw new Error('ip lookup failed')
    const data = (await response.json()) as { ip: string }
    if (!data.ip) throw new Error('ip missing')
    return data.ip
  } catch {
    return getDeviceFallbackId()
  }
}
