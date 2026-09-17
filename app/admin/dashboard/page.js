import fs from 'fs'
import path from 'path'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/admin-auth'
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
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!verifySessionToken(token)) redirect('/admin')

  const settings = await getAdminLandingSettings()
  const images = listLandingImages()
  const bundledImages = listBundledImages()
  const hasMongo = !!process.env.MONGO_URL

  return (
    <SettingsForm
      initialSettings={settings}
      availableImages={images}
      bundledImages={bundledImages}
      hasMongo={hasMongo}
    />
  )
}
