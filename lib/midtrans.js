import midtransClient from 'midtrans-client'
import { getLandingSettings } from '@/lib/db'

async function resolveCredentials() {
  const settings = await getLandingSettings()
  const serverKey = settings.midtransServerKey || process.env.MIDTRANS_SERVER_KEY || ''
  const clientKey = settings.midtransClientKey || process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || ''
  const isProduction = settings.midtransServerKey
    ? !!settings.midtransIsProduction
    : process.env.MIDTRANS_IS_PRODUCTION === 'true'
  return { serverKey, clientKey, isProduction }
}

export async function getSnapClient() {
  const { serverKey, clientKey, isProduction } = await resolveCredentials()
  if (!serverKey || !clientKey) {
    throw new Error(
      'Midtrans Server Key / Client Key belum diatur. Buka halaman admin untuk mengisinya.'
    )
  }
  return new midtransClient.Snap({ isProduction, serverKey, clientKey })
}

export async function getMidtransServerKey() {
  const { serverKey } = await resolveCredentials()
  if (!serverKey) {
    throw new Error('Midtrans Server Key belum diatur.')
  }
  return serverKey
}
