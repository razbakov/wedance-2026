/**
 * The finished poster at Instagram's exact size. Gemini returns near-sizes
 * (768×1376, 928×1152): stretched to fit, under 1% and invisible, rather than
 * cropped — the crop trimmed lines painted near the edge (RAZ-1032). The
 * read-back still checks this image.
 */
import sharp from 'sharp'
import type { InlineImage } from './gemini'

export const FLYER_SIZE = { '9:16': { width: 1080, height: 1920 }, '4:5': { width: 1080, height: 1350 } } as const

export async function fitFlyer(img: InlineImage, aspect: '9:16' | '4:5'): Promise<InlineImage> {
  const buf = await sharp(Buffer.from(img.data, 'base64')).resize({ ...FLYER_SIZE[aspect], fit: 'fill' }).png().toBuffer()
  return { mimeType: 'image/png', data: buf.toString('base64') }
}
