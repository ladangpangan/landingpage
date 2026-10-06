import { NextResponse } from 'next/server'
import { getCurrentCustomer } from '@/lib/customer-session'
import { deleteAddress, updateAddress } from '@/lib/customers'

export async function DELETE(request, { params }) {
  const customer = await getCurrentCustomer()
  if (!customer) return NextResponse.json({ error: 'Silakan masuk dulu.' }, { status: 401 })
  const { id } = await params
  const r = await deleteAddress(customer.id, id)
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 })
  return NextResponse.json({ addresses: r.addresses })
}

export async function PUT(request, { params }) {
  const customer = await getCurrentCustomer()
  if (!customer) return NextResponse.json({ error: 'Silakan masuk dulu.' }, { status: 401 })
  const { id } = await params
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body permintaan tidak valid.' }, { status: 400 })
  }
  const r = await updateAddress(customer.id, id, body)
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 })
  return NextResponse.json({ addresses: r.addresses })
}
