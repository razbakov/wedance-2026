/**
 * The picture Instagram gets for a content-plan post (#501), as a Cloudinary
 * JPEG in the shape the destination accepts:
 *
 * - feed: 4:5 (portrait) to 1.91:1 (landscape). A 9:16 flyer would be refused
 *   ("aspect ratio not supported"), so taller pictures are fitted into 4:5 on
 *   a blurred, cropped copy of themselves — nothing on the flyer is cut off.
 * - story: 9:16. Anything wider (a 4:5 post) is fitted into 1080×1920 the same way.
 *
 * The backdrop is built from a layer of the same image (`b_blurred` padding is
 * not available on our Cloudinary plan). Other hosts come back unchanged.
 */
const UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(?:v\d+\/)?(.+?)(\.[a-z0-9]+)?$/i

export type Destination = 'feed' | 'story'

/** The same picture fitted into w×h over a blurred, cropped copy of itself. */
function onBlur(publicId: string, w: number, h: number) {
  return `c_fill,w_${w},h_${h},e_blur:2000/l_${publicId.replace(/\//g, ':')}/c_fit,w_${w},h_${h}/fl_layer_apply/`
}

export function instagramImageUrl(url: string, size: { width?: number | null; height?: number | null }, dest: Destination): string {
  const m = UPLOAD.exec(url)
  // Already transformed (or not a plain upload): leave it to Instagram.
  if (!m || /^[a-z]{1,3}_[^/]*\//.test(url.slice(m[1]!.length))) return url
  const id = m[2]!
  const w = size.width || 1080
  const h = size.height || 1920
  let shape = ''
  if (dest === 'feed' && h / w > 1.26) shape = onBlur(id, 1080, 1350)
  else if (dest === 'feed' && w / h > 1.91) shape = onBlur(id, 1080, 566)
  else if (dest === 'story' && h / w < 16 / 9 - 0.05) shape = onBlur(id, 1080, 1920)
  return `${m[1]}${shape}f_jpg,q_90/${id}${m[3] ?? ''}`
}
