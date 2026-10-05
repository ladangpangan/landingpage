// Alamat situs (untuk tautan balik Google). Utamakan SITE_URL; cadangannya alamat permintaan.
export function siteOrigin(request) {
  const env = (process.env.SITE_URL || '').trim().replace(/\/+$/, '')
  if (env) return env
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  return `${proto}://${host}`
}
