'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const inputClass =
  'w-full rounded-xl border border-[#D6EBDC] bg-[#FBFEFC] px-4 py-2.5 text-[#1F3A28] outline-none focus:border-[#2FA966] focus:ring-2 focus:ring-[#2FA966]/20'
const cardClass = 'rounded-2xl border border-[#D6EBDC] bg-white p-6'
const buttonClass =
  'rounded-xl bg-[#2FA966] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#22824E] disabled:opacity-60'

const ROLE_LABEL = { owner: 'Owner', staf: 'Staf' }

// Panel ini tampil DI DALAM <form> besar halaman admin (tombol Simpan pengaturan).
// <form> bersarang tidak sah dan membuat tombol "submit" menyimpan pengaturan,
// bukan menjalankan aksi akun. Karena itu di sini tombol bertipe "button" dan
// tombol Enter ditangani sendiri.
function enterToSubmit(e, action) {
  if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
    e.preventDefault()
    action()
  }
}

async function api(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan.')
  return data
}

function ChangePassword() {
  const router = useRouter()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    try {
      await api('/api/admin/me/password', 'POST', { currentPassword: current, newPassword: next })
      toast.success('Password diganti. Silakan masuk lagi.')
      router.push('/admin')
      router.refresh()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div onKeyDown={(e) => enterToSubmit(e, submit)} className={`${cardClass} space-y-3`}>
      <h2 className="text-base font-semibold text-[#142A1C]">Ganti password saya</h2>
      <input
        type="password"
        autoComplete="current-password"
        placeholder="Password saat ini"
        className={inputClass}
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        required
      />
      <input
        type="password"
        autoComplete="new-password"
        placeholder="Password baru (minimal 10 karakter)"
        className={inputClass}
        value={next}
        onChange={(e) => setNext(e.target.value)}
        required
      />
      <button type="button" onClick={submit} disabled={busy} className={buttonClass}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simpan password baru'}
      </button>
    </div>
  )
}

function ManageUsers({ me }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', email: '', role: 'staf', password: '' })
  const [busy, setBusy] = useState(false)

  async function load() {
    setLoading(true)
    try {
      setUsers((await api('/api/admin/users', 'GET')).users)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
  }, [])

  async function create() {
    setBusy(true)
    try {
      await api('/api/admin/users', 'POST', form)
      toast.success('Akun dibuat.')
      setForm({ name: '', email: '', role: 'staf', password: '' })
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function patch(user, changes, okMessage) {
    try {
      await api(`/api/admin/users/${user.id}`, 'PATCH', changes)
      toast.success(okMessage)
      load()
    } catch (err) {
      toast.error(err.message)
    }
  }

  function resetPassword(user) {
    const pw = window.prompt(`Password baru untuk ${user.email} (minimal 10 karakter):`)
    if (pw) patch(user, { password: pw }, 'Password diganti. Orang itu perlu masuk lagi.')
  }

  return (
    <>
      <div className={cardClass}>
        <h2 className="mb-3 text-base font-semibold text-[#142A1C]">Akun admin</h2>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-[#7E9488]" />
        ) : (
          <ul className="divide-y divide-[#D6EBDC]">
            {users.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-[#142A1C]">
                    {u.name || u.email} {u.id === me.id && <span className="text-xs text-[#7E9488]">(Anda)</span>}
                  </p>
                  <p className="text-xs text-[#4C6356]">
                    {u.email} · {ROLE_LABEL[u.role]} · {u.active ? 'Aktif' : 'Nonaktif'}
                  </p>
                </div>
                {u.id !== me.id && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    <button
                      className="rounded-lg border border-[#D6EBDC] px-3 py-2"
                      onClick={() => patch(u, { active: !u.active }, u.active ? 'Akun dinonaktifkan.' : 'Akun diaktifkan.')}
                    >
                      {u.active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                    <button
                      className="rounded-lg border border-[#D6EBDC] px-3 py-2"
                      onClick={() =>
                        patch(u, { role: u.role === 'owner' ? 'staf' : 'owner' }, 'Peran diubah.')
                      }
                    >
                      Jadikan {u.role === 'owner' ? 'Staf' : 'Owner'}
                    </button>
                    <button className="rounded-lg border border-[#D6EBDC] px-3 py-2" onClick={() => resetPassword(u)}>
                      Ganti password
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div onKeyDown={(e) => enterToSubmit(e, create)} className={`${cardClass} space-y-3`}>
        <h2 className="text-base font-semibold text-[#142A1C]">Tambah akun</h2>
        <input className={inputClass} placeholder="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input
          className={inputClass}
          type="email"
          placeholder="Email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <select className={inputClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="staf">Staf (kelola produk & pesanan)</option>
          <option value="owner">Owner (semua akses, termasuk pembayaran & akun)</option>
        </select>
        <input
          className={inputClass}
          type="password"
          autoComplete="new-password"
          placeholder="Password awal (minimal 10 karakter)"
          required
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <button type="button" onClick={create} disabled={busy} className={buttonClass}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buat akun'}
        </button>
      </div>
    </>
  )
}

export default function AccountsPanel({ admin }) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className={cardClass}>
        <p className="text-sm text-[#4C6356]">
          Masuk sebagai <span className="font-medium text-[#142A1C]">{admin.email}</span> ({ROLE_LABEL[admin.role]})
        </p>
      </div>
      {admin.role === 'owner' && <ManageUsers me={admin} />}
      <ChangePassword />
    </div>
  )
}
