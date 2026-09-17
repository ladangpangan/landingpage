import './globals.css'
import { Toaster } from 'sonner'
import { CartProvider } from '@/lib/cart-context'

export const metadata = {
  title: 'ladangpangan.id — Ayam Frozen Segar Langsung dari Peternak',
  description:
    'Beli ayam frozen berkualitas langsung dari peternak mitra ladangpangan.id. Bersertifikat Halal & NKV, harga bersaing, pesan dan bayar online tanpa ribet.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        <CartProvider>{children}</CartProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
