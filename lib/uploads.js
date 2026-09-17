// Uploaded images live outside `public/` on purpose: Next's standalone
// server only serves files under public/ that existed at build time, so
// anything written there at runtime 404s. Files here are instead served by
// app/api/uploads/[filename]/route.js, a normal request handler that reads
// the filesystem fresh on every call.
import path from 'path'

export const UPLOAD_DIR = path.join(process.cwd(), 'uploads')

export const ALLOWED_UPLOAD_TYPES = {
  'image/jpeg': { ext: 'jpg', contentType: 'image/jpeg' },
  'image/png': { ext: 'png', contentType: 'image/png' },
  'image/webp': { ext: 'webp', contentType: 'image/webp' },
}

export function contentTypeForExt(ext) {
  const found = Object.values(ALLOWED_UPLOAD_TYPES).find((t) => t.ext === ext)
  return found?.contentType || 'application/octet-stream'
}
