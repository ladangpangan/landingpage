'use client'

import { useEffect, useRef, useState } from 'react'
import SafeImage from './safe-image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function HeroCarousel({ slides }) {
  const [index, setIndex] = useState(0)
  const touchStartX = useRef(null)
  const count = slides.length

  useEffect(() => {
    if (count <= 1) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), 6000)
    return () => clearInterval(timer)
  }, [count])

  function go(i) {
    setIndex(((i % count) + count) % count)
  }

  return (
    <section className="relative mx-4 mt-4 overflow-hidden rounded-3xl sm:mx-8">
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return
          const delta = e.changedTouches[0].clientX - touchStartX.current
          if (delta > 40) go(index - 1)
          else if (delta < -40) go(index + 1)
          touchStartX.current = null
        }}
      >
        {slides.map((slide, i) => (
          <div key={slide.id} className="relative h-[340px] w-full shrink-0 overflow-hidden sm:h-[420px] lg:h-[460px]">
            {slide.image ? (
              <SafeImage
                src={slide.image}
                alt={slide.title}
                fill
                sizes="100vw"
                priority={i === 0}
                className="object-cover"
                fallback={<div className="absolute inset-0 bg-lpi" />}
              />
            ) : (
              <div className="absolute inset-0 bg-lpi" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0E2A1A]/90 via-[#0E2A1A]/40 to-[#0E2A1A]/5" />
            <div className="relative z-10 flex h-full flex-col justify-end px-5 pb-8 pt-6 sm:px-12 sm:pb-12">
              {slide.badge && (
                <span className="inline-flex w-fit items-center rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-lpi">
                  {slide.badge}
                </span>
              )}
              <h1 className="mt-3 max-w-xl text-2xl font-extrabold leading-tight text-white sm:text-4xl">{slide.title}</h1>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-white/90 sm:text-base">{slide.subtitle}</p>
              <a
                href="#produk"
                className="mt-5 inline-flex h-12 w-fit items-center rounded-xl bg-white px-6 text-sm font-bold text-lpi shadow-lg transition hover:bg-lpi-light"
              >
                Belanja Sekarang
              </a>
            </div>
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Sebelumnya"
            className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lpi shadow-md sm:flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Berikutnya"
            className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lpi shadow-md sm:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute right-4 top-4 flex gap-1.5">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-white' : 'w-2 bg-white/50'}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
