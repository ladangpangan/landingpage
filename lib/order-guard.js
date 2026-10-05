// Memeriksa kunci akses pesanan dari permintaan pembeli.
import { verifyAccessKey } from '@/lib/order-access'

export function hasAccess(orderId, key) {
  return verifyAccessKey(orderId, key, process.env.ADMIN_SESSION_SECRET || '')
}
