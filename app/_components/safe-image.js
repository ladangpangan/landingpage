'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ImageOff } from 'lucide-react'

// Seperti next/image, tetapi bila berkas gambarnya hilang/gagal dimuat, yang
// tampil adalah kotak hijau muda dengan ikon (bukan ikon gambar rusak + tulisan).
// Dipakai di dalam wadah `relative` (bersama prop `fill`).
export default function SafeImage({ fallback, ...props }) {
  const [failedSrc, setFailedSrc] = useState(null)
  if (failedSrc !== null && failedSrc === props.src) {
    return (
      fallback ?? (
        <div className="absolute inset-0 flex items-center justify-center bg-lpi-light text-lpi-muted" role="img" aria-label={props.alt}>
          <ImageOff className="h-8 w-8" />
        </div>
      )
    )
  }
  // eslint-disable-next-line jsx-a11y/alt-text
  return <Image {...props} onError={() => setFailedSrc(props.src)} />
}
