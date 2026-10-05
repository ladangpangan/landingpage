// Voucher diskon belanja / diskon ongkir. Murni logika.
//
// voucher: { code, type: 'diskon_belanja'|'diskon_ongkir', valueType: 'nominal'|'persen',
//            value, maxDiscount (null = tanpa batas), minPurchase, quota (null = tak terbatas),
//            used, startsAt, endsAt, active }

export function normalizeCode(code) {
  return String(code || '').trim().toUpperCase().replace(/\s+/g, '')
}

// Apakah voucher boleh dipakai sekarang untuk belanja sebesar `subtotal`?
export function voucherEligibility(voucher, { subtotal, now = new Date() }) {
  if (!voucher || voucher.active === false) return { ok: false, error: 'Kode voucher tidak ditemukan.' }
  if (voucher.startsAt && now < new Date(voucher.startsAt)) return { ok: false, error: 'Voucher belum berlaku.' }
  if (voucher.endsAt && now > new Date(voucher.endsAt)) return { ok: false, error: 'Voucher sudah berakhir.' }
  if (voucher.quota != null && (voucher.used || 0) >= voucher.quota) return { ok: false, error: 'Kuota voucher sudah habis.' }
  const min = Number(voucher.minPurchase) || 0
  if (subtotal < min) return { ok: false, error: `Voucher ini berlaku untuk belanja minimal Rp ${min.toLocaleString('id-ID')}.` }
  return { ok: true }
}

// Besar potongan dari `base` (belanja atau ongkir), tidak pernah melebihi base.
export function voucherAmount(voucher, base) {
  const value = Number(voucher.value) || 0
  let amount = voucher.valueType === 'persen' ? Math.floor((base * value) / 100) : Math.floor(value)
  if (voucher.maxDiscount != null && Number(voucher.maxDiscount) > 0) amount = Math.min(amount, Math.floor(voucher.maxDiscount))
  return Math.max(0, Math.min(amount, base))
}

// Validasi isian voucher dari admin. Mengembalikan { value } atau { error }.
export function sanitizeVoucherInput(input) {
  if (!input || typeof input !== 'object') return { error: 'Data voucher tidak valid.' }
  const code = normalizeCode(input.code)
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return { error: 'Kode voucher 3 sampai 30 huruf/angka (boleh - dan _), tanpa spasi.' }
  const type = input.type === 'diskon_ongkir' ? 'diskon_ongkir' : input.type === 'diskon_belanja' ? 'diskon_belanja' : null
  if (!type) return { error: 'Jenis voucher harus Diskon Belanja atau Diskon Ongkir.' }
  const valueType = input.valueType === 'persen' ? 'persen' : input.valueType === 'nominal' ? 'nominal' : null
  if (!valueType) return { error: 'Jenis potongan harus Nominal atau Persen.' }
  const value = Math.round(Number(input.value))
  if (!Number.isFinite(value) || value <= 0) return { error: 'Besar potongan harus lebih dari 0.' }
  if (valueType === 'persen' && value > 100) return { error: 'Potongan persen maksimal 100.' }
  const optInt = (v) => (v === '' || v == null ? null : Math.round(Number(v)))
  const maxDiscount = optInt(input.maxDiscount)
  if (maxDiscount !== null && (!Number.isFinite(maxDiscount) || maxDiscount <= 0)) return { error: 'Batas potongan maksimal harus lebih dari 0 (atau kosongkan).' }
  const minPurchase = optInt(input.minPurchase) ?? 0
  if (!Number.isFinite(minPurchase) || minPurchase < 0) return { error: 'Belanja minimal tidak valid.' }
  const quota = optInt(input.quota)
  if (quota !== null && (!Number.isFinite(quota) || quota < 1)) return { error: 'Kuota harus 1 atau lebih (atau kosongkan untuk tak terbatas).' }
  // Tanggal tanpa jam (YYYY-MM-DD) dianggap dalam WIB: mulai = 00.00, berakhir = 23.59 pada hari itu.
  const date = (v, endOfDay) => {
    if (!v) return null
    const s = String(v)
    const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T${endOfDay ? '23:59:59' : '00:00:00'}+07:00`) : new Date(s)
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
  }
  const startsAt = date(input.startsAt, false)
  const endsAt = date(input.endsAt, true)
  if (startsAt === undefined || endsAt === undefined) return { error: 'Tanggal voucher tidak valid.' }
  if (startsAt && endsAt && new Date(endsAt) < new Date(startsAt)) return { error: 'Tanggal berakhir harus setelah tanggal mulai.' }
  return { value: { code, type, valueType, value, maxDiscount, minPurchase, quota, startsAt, endsAt, active: input.active !== false } }
}
