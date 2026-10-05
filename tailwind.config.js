/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Warna toko (docs/rencana.md): hijau tua, hijau muda, latar abu sangat muda.
        lpi: {
          DEFAULT: '#1E5A3A',
          dark: '#16452C',
          light: '#E3F0E7',
          bg: '#F5F7F6',
          ink: '#16281E',
          muted: '#58705F',
          line: '#D3E4D9',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
