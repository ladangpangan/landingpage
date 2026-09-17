import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/admin-auth'
import LoginForm from './login-form'

export default async function AdminLoginPage() {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (verifySessionToken(token)) redirect('/admin/dashboard')

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FBF6EE] px-5">
      <div className="w-full max-w-sm rounded-2xl border border-[#E7D9C4] bg-white p-8 shadow-sm">
        <h1 className="text-center text-xl font-semibold text-[#241C15]">Admin Ladang pangan.id</h1>
        <p className="mt-1 text-center text-sm text-[#6B5D4F]">Masuk untuk mengelola landing page</p>
        <LoginForm />
      </div>
    </div>
  )
}
