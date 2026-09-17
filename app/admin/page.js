import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/admin-auth'
import LoginForm from './login-form'

export default async function AdminLoginPage() {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (verifySessionToken(token)) redirect('/admin/dashboard')

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FFFFFF] px-5">
      <div className="w-full max-w-sm rounded-2xl border border-[#D6EBDC] bg-white p-8 shadow-sm">
        <h1 className="text-center text-xl font-semibold text-[#142A1C]">Admin Ladang pangan.id</h1>
        <p className="mt-1 text-center text-sm text-[#4C6356]">Masuk untuk mengelola landing page</p>
        <LoginForm />
      </div>
    </div>
  )
}
