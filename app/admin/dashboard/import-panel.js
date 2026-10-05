'use client'

import { useRef, useState } from 'react'
import { Download, FileUp, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { CSV_TEMPLATE } from '@/lib/product-import'

// Impor produk dari CSV. Excel: "Simpan sebagai" -> "CSV (pemisah koma)".
export default function ImportPanel({ onImported }) {
  const fileRef = useRef(null)
  const [csv, setCsv] = useState('')
  const [fileName, setFileName] = useState('')
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)

  async function call(apply, text = csv) {
    setBusy(true)
    try {
      const res = await fetch('/api/admin/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: text, apply }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setPreview(data.errors ? data : null)
        throw new Error(data.error || 'Gagal memeriksa berkas.')
      }
      setPreview(data)
      if (apply) {
        toast.success(`Impor selesai: ${data.creates.length} baru, ${data.updates.length} diubah.`)
        setCsv('')
        setFileName('')
        if (fileRef.current) fileRef.current.value = ''
        onImported?.()
      }
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function pick(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const text = await file.text()
    setCsv(text)
    setPreview(null)
    call(false, text)
  }

  function download() {
    const blob = new Blob(['﻿' + CSV_TEMPLATE + '\n'], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'contoh-produk.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const ok = preview && (preview.creates.length > 0 || preview.updates.length > 0)

  return (
    <div className="space-y-3 rounded-2xl border border-lpi-line bg-white p-4 sm:p-5">
      <div>
        <h3 className="text-base font-bold text-lpi-ink">Impor produk dari Excel / CSV</h3>
        <p className="mt-1 text-sm text-lpi-muted">
          Isi di Excel, lalu pilih <b>Simpan sebagai → CSV</b>. Produk dicocokkan lewat Kode ERP, lalu nama. Sel kosong tidak menghapus data yang sudah ada.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={download} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-lpi-line px-4 text-sm font-semibold text-lpi-ink"><Download className="h-4 w-4" /> Unduh contoh berkas</button>
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-lpi px-4 text-sm font-semibold text-white">
          <FileUp className="h-4 w-4" /> Pilih berkas CSV
          <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={pick} />
        </label>
      </div>
      {fileName && <p className="text-xs text-lpi-muted">Berkas: {fileName}</p>}
      {busy && <Loader2 className="h-5 w-5 animate-spin text-lpi" />}
      {preview && (
        <div className="space-y-2 rounded-xl border border-lpi-line bg-lpi-bg p-3 text-sm">
          <p className="font-semibold text-lpi-ink">
            {preview.applied ? 'Hasil impor' : 'Pratinjau'}: {preview.creates.length} produk baru, {preview.updates.length} diubah, {preview.errors.length} baris bermasalah
          </p>
          {preview.creates.length > 0 && <p className="text-lpi-muted">Baru: {preview.creates.map((c) => c.name).join(', ')}</p>}
          {preview.updates.length > 0 && <p className="text-lpi-muted">Diubah: {preview.updates.map((u) => u.name).join(', ')}</p>}
          {preview.errors.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5 text-red-700">
              {preview.errors.slice(0, 20).map((er, i) => <li key={i}>Baris {er.line}{er.name ? ` (${er.name})` : ''}: {er.error}</li>)}
            </ul>
          )}
          {!preview.applied && ok && (
            <button type="button" disabled={busy} onClick={() => call(true)} className="min-h-11 rounded-xl bg-lpi px-4 font-semibold text-white disabled:opacity-60">
              Terapkan impor{preview.errors.length ? ' (baris bermasalah dilewati)' : ''}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
