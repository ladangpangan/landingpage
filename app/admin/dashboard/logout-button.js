'use client'

import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="shrink-0 rounded-lg border border-[#E7D9C4] bg-white px-3 py-2 text-sm text-[#3B2C21] hover:border-[#B3402A]"
    >
      Keluar
    </button>
  )
}
