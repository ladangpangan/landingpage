import './globals.css'
import { Toaster } from 'sonner'

export const metadata = {
  title: 'Ladang pangan.id — Ayam Frozen Segar Langsung dari Peternak',
  description:
    'Beli ayam frozen berkualitas langsung dari peternak mitra Ladang pangan.id. Bersertifikat Halal & NKV, harga bersaing, pesan dan bayar online tanpa ribet.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
