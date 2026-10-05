'use client'

import { Printer } from 'lucide-react'

export default function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-lpi px-4 text-sm font-semibold text-white">
      <Printer className="h-4 w-4" /> Cetak
    </button>
  )
}
