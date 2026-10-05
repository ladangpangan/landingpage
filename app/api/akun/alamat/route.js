import { NextResponse } from 'next/server'
import { getCurrentCustomer } from '@/lib/customer-session'
import { addAddress } from '@/lib/customers'

export async function POST(request) {
  const customer = await getCurrentCustomer()
  if (!customer) return NextResponse.json({ error: 'Silakan masuk dulu.' }, { status: 401 })
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body permintaan tidak valid.' }, { status: 400 })
  }
  const r = await addAddress(customer.id, body)
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 })
  return NextResponse.json({ addresses: r.addresses })
}
