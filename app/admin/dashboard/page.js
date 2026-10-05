import fs from 'fs'
import path from 'path'
import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/admin-auth'
import { getAdminLandingSettings } from '@/lib/db'
import SettingsForm from './settings-form'

function listUploadedImages() {
  try {
    const dir = path.join(process.cwd(), 'uploads')
    return fs
      .readdirSync(dir)
      .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
      .map((f) => `/api/uploads/${f}`)
      .sort()
      .reverse()
  } catch {
    return []
  }
}

// Hanya foto yang diunggah sendiri (terbaru dulu). Foto bawaan template tidak
// ditawarkan lagi di pemilih gambar maupun galeri.
function listLandingImages() {
  return listUploadedImages()
}

export default async function AdminDashboardPage() {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/admin')

  const settings = await getAdminLandingSettings({ role: admin.role })
  const images = listLandingImages()
  const hasMongo = !!process.env.MONGO_URL

  return (
    <SettingsForm
      initialSettings={settings}
      availableImages={images}
      hasMongo={hasMongo}
      admin={admin}
    />
  )
}
