// Referral: kode milik perujuk memberi diskon ke pembeli dan komisi ke perujuk. Murni logika (tanpa database).
import { normalizePhone } from './order-access.js'
import { normalizeCode } from './vouchers-math.js'

export const DEFAULT_REFERRAL_CONFIG = { enabled: true, discountPct: 5, discountMax: 20000, commissionPct: 5 }

const intIn = (v, min, max) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) && n >= min && n <= max ? n : null
}

// Pengaturan global referral dari admin. { value } atau { error }.
export function sanitizeReferralConfig(input) {
  if (!input || typeof input !== 'object') return { error: 'Data pengaturan tidak valid.' }
  const discountPct = intIn(input.discountPct, 0, 50)
  if (discountPct === null) return { error: 'Diskon pembeli harus 0 sampai 50 persen.' }
  const discountMax = input.discountMax === '' || input.discountMax == null ? 0 : intIn(input.discountMax, 0, 5_000_000)
  if (discountMax === null) return { error: 'Batas diskon maksimal tidak valid (kosongkan atau 0 untuk tanpa batas).' }
  const commissionPct = intIn(input.commissionPct, 0, 50)
  if (commissionPct === null) return { error: 'Komisi perujuk harus 0 sampai 50 persen.' }
  return { value: { enabled: input.enabled !== false, discountPct, discountMax, commissionPct } }
}

// Data perujuk dari admin. { value } atau { error }.
export function sanitizeReferralInput(input) {
  if (!input || typeof input !== 'object') return { error: 'Data perujuk tidak valid.' }
  const code = normalizeCode(input.code)
  if (!/^[A-Z0-9]{3,20}$/.test(code)) return { error: 'Kode referral 3 sampai 20 huruf/angka, tanpa spasi atau simbol.' }
  const name = String(input.name || '').trim().slice(0, 50)
  if (!name) return { error: 'Nama perujuk wajib diisi.' }
  const phone = normalizePhone(input.phone)
  if (!/^62\d{8,13}$/.test(phone)) return { error: 'Nomor WhatsApp perujuk tidak valid. Contoh: 0812 3456 7890.' }
  return { value: { code, name, phone, active: input.active !== false } }
}

// Diskon pembeli diperlakukan seperti voucher "diskon_belanja" persen supaya memakai mesin hitung yang sama.
export function referralAsVoucher(referral, config) {
  return {
    code: referral.code,
    type: 'diskon_belanja',
    valueType: 'persen',
    value: config.discountPct,
    maxDiscount: config.discountMax > 0 ? config.discountMax : null,
    minPurchase: 0,
    quota: null,
    used: 0,
    startsAt: null,
    endsAt: null,
    active: !!referral.active && config.enabled !== false && config.discountPct > 0,
  }
}

// Komisi dihitung dari belanja SETELAH diskon, tanpa ongkir.
export function commissionFor(subtotalAfter, commissionPct) {
  return Math.max(0, Math.floor((Number(subtotalAfter) || 0) * (Number(commissionPct) || 0) / 100))
}

// Perujuk tidak boleh memakai kodenya sendiri (cocokkan nomor WhatsApp).
export function isSelfReferral(referralPhone, buyerPhones) {
  const ref = normalizePhone(referralPhone)
  if (ref.length < 9) return false
  return (buyerPhones || []).some((p) => normalizePhone(p) === ref)
}

// Ringkasan komisi per kode dari pesanan yang membawa `referral`.
// status: pending (menunggu Diterima), earned (siap dibayar), paid, void (pesanan batal).
export function summarizeReferralOrders(orders) {
  const by = new Map()
  for (const o of orders) {
    const r = o.referral
    if (!r?.code) continue
    let s = by.get(r.code)
    if (!s) {
      s = { code: r.code, orders: 0, pending: 0, earned: 0, paid: 0, pendingAmount: 0, earnedAmount: 0, paidAmount: 0 }
      by.set(r.code, s)
    }
    const c = Number(r.commission) || 0
    if (r.status === 'void') continue
    s.orders += 1
    if (r.status === 'earned') { s.earned += 1; s.earnedAmount += c }
    else if (r.status === 'paid') { s.paid += 1; s.paidAmount += c }
    else { s.pending += 1; s.pendingAmount += c }
  }
  return by
}
