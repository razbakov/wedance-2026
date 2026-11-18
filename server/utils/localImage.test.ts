import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { cloudinaryConfigured, imageKind, localImageFallbackAllowed, readLocalImage, saveLocalImage } from './localImage'

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])
let dir = ''

afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true })
  delete process.env.WEDANCE_UPLOAD_DIR
  dir = ''
})

describe('localImageFallbackAllowed', () => {
  it('stays off when Cloudinary is configured', () => {
    expect(localImageFallbackAllowed({ cloud: 'wd', key: 'k', secret: 's', siteUrl: 'http://localhost:3000' })).toBe(false)
  })

  it('stays off on production even if the keys are missing', () => {
    expect(localImageFallbackAllowed({ vercelEnv: 'production', siteUrl: 'https://2026.wedance.vip' })).toBe(false)
    expect(localImageFallbackAllowed({ siteUrl: 'https://wedance.vip' })).toBe(false)
    expect(localImageFallbackAllowed({ siteUrl: 'https://2026.wedance.vip' })).toBe(false)
  })

  it('is on for a preview or local dev without keys', () => {
    expect(localImageFallbackAllowed({ siteUrl: 'https://pr-674.dev.wedance.vip' })).toBe(true)
    expect(localImageFallbackAllowed({ vercelEnv: 'preview', siteUrl: 'https://wedance-2026-git-x.vercel.app' })).toBe(true)
    expect(localImageFallbackAllowed({ siteUrl: 'http://localhost:3000' })).toBe(true)
    expect(cloudinaryConfigured({})).toBe(false)
  })
})

describe('saveLocalImage', () => {
  it('stores an image and reads it back, and refuses anything else', () => {
    dir = mkdtempSync(join(tmpdir(), 'wd-img-'))
    process.env.WEDANCE_UPLOAD_DIR = dir
    expect(imageKind(PNG)).toBe('png')
    expect(imageKind(Uint8Array.from([1, 2, 3, 4]))).toBeNull()
    const saved = saveLocalImage(PNG)
    expect(saved.kind).toBe('png')
    const back = readLocalImage(saved.id)
    expect(back?.type).toBe('image/png')
    expect(back?.bytes.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]))
    expect(readLocalImage('../etc/passwd')).toBeNull()
    expect(readLocalImage('not-an-id')).toBeNull()
    expect(() => saveLocalImage(Uint8Array.from([1, 2, 3]))).toThrow('NOT_IMAGE')
  })
})
