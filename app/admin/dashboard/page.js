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

function listBundledImages() {
  try {
    const dir = path.join(process.cwd(), 'public', 'landing')
    return fs
      .readdirSync(dir)
      .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
      .map((f) => `/landing/${f}`)
      .sort()
  } catch {
    return []
  }
}

function listLandingImages() {
  // Newest uploads first, then the bundled starter photos.
  return [...listUploadedImages(), ...listBundledImages()]
}

export default async function AdminDashboardPage() {
  const admin = await getCurrentAdmin()
  if (!admin) redirect('/admin')

  const settings = await getAdminLandingSettings({ role: admin.role })
  const images = listLandingImages()
  const bundledImages = listBundledImages()
  const hasMongo = !!process.env.MONGO_URL

  return (
    <SettingsForm
      initialSettings={settings}
      availableImages={images}
      bundledImages={bundledImages}
      hasMongo={hasMongo}
      admin={admin}
    />
  )
}
