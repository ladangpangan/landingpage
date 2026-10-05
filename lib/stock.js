// Stok per varian (koleksi variants, field stock). stock = null artinya tidak
// dilacak (tak terbatas). Pengurangan stok bersifat atomik per varian supaya
// dua pembeli tidak bisa membeli stok terakhir yang sama.
import { getDb } from '@/lib/mongo'
import { ensureSchema } from '@/lib/schema'

async function variants() {
  const db = getDb()
  if (!db) throw new Error('Database belum tersambung (MONGO_URL).')
  await ensureSchema()
  return db.collection('variants')
}

// requirements: [{ variantId, qty }]. Mengembalikan
//   { ok: true, reserved: [{ variantId, qty }] }   (hanya varian yang stoknya dilacak)
//   { ok: false, variantId }                        (stok tidak cukup; semua pengurangan dibatalkan)
export async function reserveStock(requirements) {
  const col = await variants()
  const reserved = []
  for (const { variantId, qty } of requirements) {
    const v = await col.findOne({ _id: variantId })
    if (!v || v.active === false) {
      await releaseStock(reserved)
      return { ok: false, variantId }
    }
    if (v.stock === null || v.stock === undefined) continue // tak terbatas
    const res = await col.updateOne({ _id: variantId, stock: { $gte: qty } }, { $inc: { stock: -qty } })
    if (!res.modifiedCount) {
      await releaseStock(reserved)
      return { ok: false, variantId }
    }
    reserved.push({ variantId, qty })
  }
  return { ok: true, reserved }
}

export async function releaseStock(reserved) {
  if (!reserved?.length) return
  const col = await variants()
  for (const { variantId, qty } of reserved) {
    await col.updateOne({ _id: variantId, stock: { $ne: null } }, { $inc: { stock: qty } })
  }
}
