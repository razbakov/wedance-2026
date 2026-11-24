import { describe, it, expect } from 'vitest'
import sharp from 'sharp'
import { fitFlyer } from './fit'

describe('fitFlyer', () => {
  it('makes the finished 9:16 poster 1080×1920 without cropping a line painted on the bottom edge', async () => {
    // Taller than 9:16, like Gemini’s near-sizes. A few red pixels on the bottom edge are what a full-bleed address looks like.
    const bar = await sharp({ create: { width: 768, height: 8, channels: 3, background: '#f00' } }).png().toBuffer()
    const src = await sharp({ create: { width: 768, height: 1400, channels: 3, background: '#fff' } })
      .composite([{ input: bar, top: 1392, left: 0 }])
      .png()
      .toBuffer()
    const fitted = await fitFlyer({ mimeType: 'image/png', data: src.toString('base64') }, '9:16')
    const out = sharp(Buffer.from(fitted.data, 'base64'))
    const meta = await out.metadata()
    expect(meta.width).toBe(1080)
    expect(meta.height).toBe(1920)
    const { data, info } = await out.raw().toBuffer({ resolveWithObject: true })
    const i = ((info.height - 1) * info.width + Math.floor(info.width / 2)) * info.channels
    // Stretched, not cropped: the red edge is still there (a crop took it off, RAZ-1032).
    expect(data[i]).toBeGreaterThan(200)
    expect(data[i + 1]).toBeLessThan(60)
    expect(data[i + 2]).toBeLessThan(60)
  })
})
