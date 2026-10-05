// Data untuk halaman admin "Ongkir & Voucher".
import { getDeliveryConfig, listZones } from '@/lib/delivery'
import { listVouchers } from '@/lib/vouchers'
import { slotCapacityKg } from '@/lib/shipping'

export async function deliverySnapshot() {
  const [config, zones, vouchers] = await Promise.all([getDeliveryConfig(), listZones(), listVouchers()])
  return { config, zones, vouchers, capacityKg: slotCapacityKg(config) }
}
