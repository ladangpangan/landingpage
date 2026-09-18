import './globals.css'
import { Toaster } from 'sonner'
import { CartProvider } from '@/lib/cart-context'
import { getPublicLandingSettings } from '@/lib/db'

const SITE_URL = 'https://marketplace.ladangpangan.id'
const TITLE = 'ladangpangan.id — Ayam Frozen Segar Langsung dari Peternak'
const DESCRIPTION =
  'Beli ayam frozen berkualitas langsung dari peternak mitra ladangpangan.id. Bersertifikat Halal & NKV, harga bersaing, pesan dan bayar online tanpa ribet.'

export async function generateMetadata() {
  const settings = await getPublicLandingSettings()
  const ogImage = settings.logoUrl || '/landing/produk-1.jpeg'

  return {
    metadataBase: new URL(SITE_URL),
    title: TITLE,
    description: DESCRIPTION,
    keywords: ['ayam frozen', 'ayam potong', 'karkas ayam', 'jual ayam beku', 'ladang pangan'],
    icons: settings.logoUrl ? { icon: settings.logoUrl } : undefined,
    openGraph: {
      title: TITLE,
      description: DESCRIPTION,
      url: SITE_URL,
      siteName: 'ladangpangan.id',
      images: [{ url: ogImage }],
      locale: 'id_ID',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: TITLE,
      description: DESCRIPTION,
      images: [ogImage],
    },
  }
}

export default async function RootLayout({ children }) {
  const settings = await getPublicLandingSettings()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'GroceryStore',
    name: 'ladangpangan.id',
    url: SITE_URL,
    description: DESCRIPTION,
    image: settings.logoUrl ? `${SITE_URL}${settings.logoUrl}` : undefined,
    telephone: settings.whatsappNumber ? `+${settings.whatsappNumber}` : undefined,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Sidoarjo',
      addressRegion: 'Jawa Timur',
      addressCountry: 'ID',
    },
    priceRange: '$$',
  }

  return (
    <html lang="id">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <CartProvider>{children}</CartProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
