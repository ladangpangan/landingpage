/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  // Logo dulu ada di /landing/logo.png (disimpan di pengaturan toko). Berkasnya
  // dipindah ke /logo.png; alamat lama tetap jalan lewat pengalihan ini.
  async redirects() {
    return [{ source: '/landing/logo.png', destination: '/logo.png', permanent: true }]
  },
}

module.exports = nextConfig
