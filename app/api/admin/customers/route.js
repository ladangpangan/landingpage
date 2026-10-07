import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { loadCustomerOverview } from '@/lib/customers'
import { summarizeCustomers, filterCustomers } from '@/lib/customer-stats'

export const dynamic = 'force-dynamic'

// Data pelanggan: khusus Owner (data pribadi). Staf tidak boleh melihat.
export async function GET(request) {
  const { error } = await requireAdmin('owner')
  if (error) return error
  const q = new URL(request.url).searchParams.get('q') || ''
  try {
    const { members, guests } = summarizeCustomers(await loadCustomerOverview())
    return NextResponse.json({
      members: filterCustomers(members, q).slice(0, 300),
      guests: filterCustomers(guests, q).slice(0, 300),
      totals: { members: members.length, guests: guests.length },
    })
  } catch (e) {
    console.error('[admin/customers]', e?.message || e)
    return NextResponse.json({ error: 'Gagal memuat data pelanggan.' }, { status: 500 })
  }
}
