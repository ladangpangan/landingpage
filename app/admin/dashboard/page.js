import fs from 'fs'
import path from 'path'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/admin-auth'
import { getAdminLandingSettings } from '@/lib/db'
import SettingsForm from './settings-form'
import LogoutButton from './logout-button'

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

  return (
    <div className="min-h-screen bg-[#FFFFFF] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#142A1C]">Landing Page Ayam Frozen</h1>
            <p className="mt-1 text-sm text-[#4C6356]">
              Kelola konten halaman{' '}
              <a href="/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                landing page
              </a>{' '}
              dan kredensial Midtrans. Perubahan langsung tayang setelah disimpan.
            </p>
          </div>
          <LogoutButton />
        </div>
        <SettingsForm initialSettings={settings} availableImages={images} />
      </div>
    </div>
  )
}
