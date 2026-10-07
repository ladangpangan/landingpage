import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { loadCustomerOverview } from '@/lib/customers'
import { summarizeCustomers, customersToCsv } from '@/lib/customer-stats'

export const dynamic = 'force-dynamic'

// Ekspor CSV seluruh pelanggan (khusus Owner).
export async function GET() {
  const { error } = await requireAdmin('owner')
  if (error) return error
  try {
    const csv = customersToCsv(summarizeCustomers(await loadCustomerOverview()))
    return new NextResponse(`﻿${csv}`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="pelanggan-ladangpangan.csv"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    console.error('[admin/customers/export]', e?.message || e)
    return NextResponse.json({ error: 'Gagal mengekspor.' }, { status: 500 })
  }
}
