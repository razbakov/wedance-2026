/**
 * Photo uploads when Cloudinary isn't configured (PR previews, local dev).
 *
 * Production on Vercel has the Cloudinary keys and never comes here. A preview
 * on the dev server does not, and the Meet deck only shows dancers who have a
 * photo — so a test dancer needs somewhere to put one. Files live on the
 * preview container's disk and are served back by /api/media/file/:id.
 */
import { randomBytes } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export type ImageKind = 'jpg' | 'png' | 'webp' | 'gif'

const TYPES: Record<ImageKind, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
}

export function uploadDir(): string {
  return process.env.WEDANCE_UPLOAD_DIR || join(tmpdir(), 'wedance-uploads')
}

/** Cloudinary is configured — the production upload path. */
export function cloudinaryConfigured(env: { cloud?: string, key?: string, secret?: string }): boolean {
  return !!(env.cloud && env.key && env.secret)
}

/**
 * Store the file on this server only when Cloudinary isn't set up, and never
 * on production. A production deploy with missing keys keeps the 503.
 */
export function localImageFallbackAllowed(env: {
  cloud?: string
  key?: string
  secret?: string
  vercelEnv?: string
  siteUrl?: string
}): boolean {
  if (cloudinaryConfigured(env)) return false
  if (env.vercelEnv === 'production') return false
  const site = env.siteUrl || ''
  if (site) {
    try {
      const host = new URL(site).host
      if (host === '2026.wedance.vip' || host === 'wedance.vip') return false
    } catch { /* not a URL — not the production host */ }
  }
  return true
}

/** jpeg / png / webp / gif from the bytes, not the browser's MIME claim. */
export function imageKind(buf: Uint8Array): ImageKind | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg'
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png'
  if (buf.length >= 6) {
    const sig = String.fromCharCode(...buf.subarray(0, 6))
    if (sig === 'GIF87a' || sig === 'GIF89a') return 'gif'
  }
  if (buf.length >= 12 && String.fromCharCode(...buf.subarray(0, 4)) === 'RIFF' && String.fromCharCode(...buf.subarray(8, 12)) === 'WEBP') return 'webp'
  return null
}

export function contentTypeFor(kind: ImageKind): string {
  return TYPES[kind]
}

/** 32 hex chars, nothing else — the only ids the file route will open. */
export function localImagePath(id: string | undefined): string | null {
  if (!id || !/^[a-f0-9]{32}$/.test(id)) return null
  return join(uploadDir(), id)
}

export function saveLocalImage(bytes: Uint8Array): { id: string, kind: ImageKind } {
  const kind = imageKind(bytes)
  if (!kind) throw new Error('NOT_IMAGE')
  const id = randomBytes(16).toString('hex')
  mkdirSync(uploadDir(), { recursive: true })
  writeFileSync(join(uploadDir(), id), bytes)
  return { id, kind }
}

export function readLocalImage(id: string | undefined): { bytes: Buffer, type: string } | null {
  const path = localImagePath(id)
  if (!path) return null
  let bytes: Buffer
  try { bytes = readFileSync(path) } catch { return null }
  const kind = imageKind(bytes)
  if (!kind) return null
  return { bytes, type: contentTypeFor(kind) }
}
