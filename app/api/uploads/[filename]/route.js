import fs from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'
import { UPLOAD_DIR, contentTypeForExt } from '@/lib/uploads'

// Uploaded files are written to disk at runtime, long after this route's
// first request. Next.js caches GET route handlers by default, so without
// this the first hit to a not-yet-uploaded filename gets cached and keeps
// 404ing forever even after the file exists — this route must always hit
// the filesystem fresh.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request, { params }) {
  const { filename } = await params
  // Dynamic route segments are single path components already, but guard
  // against traversal defensively since this reads straight off disk.
  if (!filename || filename.includes('/') || filename.includes('..')) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  const ext = filename.split('.').pop()?.toLowerCase()
  try {
    const bytes = await fs.readFile(path.join(UPLOAD_DIR, filename))
    return new NextResponse(bytes, {
      headers: {
        'Content-Type': contentTypeForExt(ext),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }
}
