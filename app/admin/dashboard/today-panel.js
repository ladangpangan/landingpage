'use client'

import { AlertTriangle, ClipboardList, PackageCheck, Truck, Wallet } from 'lucide-react'

function Tile({ icon: Icon, label, value, hint, tone = 'default', onClick }) {
  const toneClass = tone === 'alert' ? 'border-lpi bg-lpi text-white' : tone === 'bad' ? 'border-red-300 bg-red-50 text-red-800' : 'border-lpi-line bg-white text-lpi-ink'
  return (
    <button type="button" onClick={onClick} className={`rounded-2xl border p-4 text-left ${toneClass}`}>
      <Icon className="h-5 w-5 opacity-80" />
      <p className="mt-2 text-3xl font-bold">{value ?? '–'}</p>
      <p className="text-sm font-semibold">{label}</p>
      {hint && <p className="mt-0.5 text-xs opacity-80">{hint}</p>}
    </button>
  )
}

// summary: hasil GET /api/admin/today (atau null saat belum termuat).
export default function TodayPanel({ summary, go, hasMongo }) {
  const c = summary?.counts || {}
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      {!hasMongo && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /> Database belum tersambung (MONGO_URL).
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Tile icon={Wallet} label="Sudah dibayar, belum dikemas" value={c.dibayar || 0} tone={c.dibayar ? 'alert' : 'default'} hint="Kemas pesanan ini dulu" onClick={() => go('orders', 'dibayar')} />
        <Tile icon={PackageCheck} label="Sedang dikemas" value={c.dikemas || 0} onClick={() => go('orders', 'dikemas')} />
        <Tile icon={Truck} label="Kirim hari ini" value={summary?.deliveriesToday ?? 0} hint={summary ? `±${summary.kgToday} kg` : ''} onClick={() => go('kirim')} />
        <Tile icon={ClipboardList} label="Menunggu bayar" value={c.menunggu_bayar || 0} onClick={() => go('orders', 'menunggu_bayar')} />
      </div>
      {summary?.needsReview > 0 && (
        <button type="button" onClick={() => go('orders')} className="flex w-full items-start gap-3 rounded-2xl border border-red-300 bg-red-50 p-4 text-left text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <span><b>{summary.needsReview} pesanan perlu dicek.</b> Ada pembayaran yang jumlahnya tidak cocok, atau uang masuk untuk pesanan yang sudah batal. Cek di Midtrans, lalu hubungi pembeli.</span>
        </button>
      )}
      {(summary?.soldOut?.length > 0 || summary?.lowStock?.length > 0) && (
        <div className="rounded-2xl border border-lpi-line bg-white p-4 text-sm">
          <p className="font-semibold text-lpi-ink">Stok perlu perhatian</p>
          {summary.soldOut.length > 0 && <p className="mt-1 text-red-700">Habis: {summary.soldOut.join(', ')}</p>}
          {summary.lowStock.length > 0 && <p className="mt-1 text-lpi-muted">Menipis: {summary.lowStock.map((p) => `${p.name} (${p.stock})`).join(', ')}</p>}
          <button type="button" onClick={() => go('products')} className="mt-3 min-h-11 rounded-xl border border-lpi-line px-4 font-semibold text-lpi">Atur stok</button>
        </div>
      )}
      <p className="text-center text-xs text-lpi-muted">Halaman ini diperbarui otomatis. Pesanan baru yang sudah dibayar akan muncul sebagai pemberitahuan.</p>
    </div>
  )
}
