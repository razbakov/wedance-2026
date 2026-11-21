/**
 * The finished poster at Instagram's exact size. Gemini returns near-sizes
 * (768×1376, 928×1152); cover from the centre trims the rest. That trim is
 * what cuts a line painted on the edge, so the read-back checks this image,
 * and the paint prompt keeps text inside a margin wider than the trim.
 */
import sharp from 'sharp'
import type { InlineImage } from './gemini'

export const FLYER_SIZE = { '9:16': { width: 1080, height: 1920 }, '4:5': { width: 1080, height: 1350 } } as const

export async function fitFlyer(img: InlineImage, aspect: '9:16' | '4:5'): Promise<InlineImage> {
  const buf = await sharp(Buffer.from(img.data, 'base64')).resize({ ...FLYER_SIZE[aspect], fit: 'cover', position: 'centre' }).png().toBuffer()
  return { mimeType: 'image/png', data: buf.toString('base64') }
}
