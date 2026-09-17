// Pushes a newly-placed order to the ERP as a draft Contact + Sales Order,
// via the integration endpoint described in DEPLOYMENT.md. No-ops silently
// when ERP_INTEGRATION_URL / ERP_INTEGRATION_KEY aren't set, so checkout
// keeps working normally before that endpoint exists on the ERP side.
export async function syncOrderToErp({ orderId, items, customer, grossAmount }) {
  const url = process.env.ERP_INTEGRATION_URL
  const key = process.env.ERP_INTEGRATION_KEY
  if (!url || !key) return

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key },
      body: JSON.stringify({
        orderId,
        customer,
        items: items.map((it) => ({ id: it.id, name: it.name, price: it.price, qty: it.qty })),
        grossAmount,
      }),
    })
    if (!res.ok) {
      console.error('[erp-sync] ERP menolak order', orderId, res.status, await res.text().catch(() => ''))
    }
  } catch (e) {
    console.error('[erp-sync] gagal sinkron order ke ERP:', e?.message || e)
  }
}
