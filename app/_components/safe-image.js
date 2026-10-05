'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { ImageOff } from 'lucide-react'

// Seperti next/image, tetapi bila berkas gambarnya hilang/gagal dimuat, yang
// tampil adalah kotak hijau muda dengan ikon (bukan ikon gambar rusak + tulisan).
// Dipakai di dalam wadah `relative` (bersama prop `fill`).
const MAX_RETRIES = 2

// Seperti next/image, tetapi:
// - bila foto gagal dimuat (mis. sinyal putus sebentar), dicoba lagi sampai 2 kali
//   sebelum kotak hijau dengan ikon tampil;
// - bila berkasnya memang hilang, yang tampil kotak hijau (bukan ikon gambar rusak).
// Dipakai di dalam wadah `relative` (bersama prop `fill`).
export default function SafeImage({ fallback, ...props }) {
  const [state, setState] = useState({ src: props.src, tries: 0, failed: false })
  // Foto berganti: mulai dari awal.
  const cur = state.src === props.src ? state : { src: props.src, tries: 0, failed: false }
  const missing = !props.src || cur.failed

  useEffect(() => {
    if (state.src !== props.src) setState({ src: props.src, tries: 0, failed: false })
  }, [props.src, state.src])

  if (missing) {
    return (
      fallback ?? (
        <div className="absolute inset-0 flex items-center justify-center bg-lpi-light text-lpi-muted" role="img" aria-label={props.alt}>
          <ImageOff className="h-8 w-8" />
        </div>
      )
    )
  }

  function onError() {
    if (cur.tries >= MAX_RETRIES) return setState({ src: props.src, tries: cur.tries, failed: true })
    // Jeda sebentar (1 dtk, lalu 2 dtk) sebelum mencoba lagi.
    setTimeout(() => setState((s) => (s.src === props.src ? { ...s, tries: s.tries + 1 } : s)), 1000 * (cur.tries + 1))
  }

  const src = cur.tries > 0 ? `${props.src}${String(props.src).includes('?') ? '&' : '?'}r=${cur.tries}` : props.src
  // eslint-disable-next-line jsx-a11y/alt-text
  return <Image key={cur.tries} {...props} src={src} onError={onError} />
}
