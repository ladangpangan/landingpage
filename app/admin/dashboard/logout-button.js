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
      className="shrink-0 rounded-lg border border-[#D6EBDC] bg-white px-3 py-2 text-sm text-[#1F3A28] hover:border-[#2FA966]"
    >
      Keluar
    </button>
  )
}
