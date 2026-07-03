/**
 * Turn a public video URL (YouTube / Instagram / TikTok) into an embeddable
 * iframe src, and derive a thumbnail where the provider makes one addressable.
 *
 * Videos on WeDance are embed URLs, never hosted uploads — so this helper is
 * the single place that knows how each provider's share links map to an
 * embed/thumbnail. Unknown providers degrade gracefully to a link-out (no
 * iframe, no thumbnail) so a paste of any URL never hard-breaks the UI.
 */

export type VideoProvider = 'youtube' | 'instagram' | 'tiktok' | 'unknown'

export interface VideoEmbed {
  provider: VideoProvider
  /** iframe src, or null when the provider can't be embedded (link-out only). */
  embedUrl: string | null
  /** derivable thumbnail, or null. */
  thumbnailUrl: string | null
  /** the original URL — always safe to render as a link-out fallback. */
  originalUrl: string
}

/** Extract a YouTube video id from watch / youtu.be / shorts / embed URLs. */
export function youtubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
  ]
  for (const re of patterns) {
    const m = url.match(re)
    if (m) return m[1]
  }
  return null
}

/** Extract an Instagram reel/post shortcode. */
export function instagramShortcode(url: string): string | null {
  const m = url.match(/instagram\.com\/(?:reel|reels|p|tv)\/([\w-]+)/)
  return m ? m[1] : null
}

/** Extract a TikTok numeric video id from a full (non-shortened) URL. */
export function tiktokId(url: string): string | null {
  const m = url.match(/tiktok\.com\/(?:@[\w.-]+\/video\/|v\/)(\d+)/)
  return m ? m[1] : null
}

export function parseVideoUrl(url: string): VideoEmbed {
  const trimmed = (url ?? '').trim()

  const yt = youtubeId(trimmed)
  if (yt) {
    return {
      provider: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${yt}`,
      thumbnailUrl: `https://img.youtube.com/vi/${yt}/hqdefault.jpg`,
      originalUrl: trimmed,
    }
  }

  const ig = instagramShortcode(trimmed)
  if (ig) {
    return {
      provider: 'instagram',
      // Instagram's embed endpoint. Thumbnails require the oEmbed API + token,
      // so we leave it null and let the UI show the embed or a link-out.
      embedUrl: `https://www.instagram.com/reel/${ig}/embed`,
      thumbnailUrl: null,
      originalUrl: trimmed,
    }
  }

  const tt = tiktokId(trimmed)
  if (tt) {
    return {
      provider: 'tiktok',
      embedUrl: `https://www.tiktok.com/embed/v2/${tt}`,
      thumbnailUrl: null,
      originalUrl: trimmed,
    }
  }

  return {
    provider: 'unknown',
    embedUrl: null,
    thumbnailUrl: null,
    originalUrl: trimmed,
  }
}

/**
 * Best-effort thumbnail for a URL at submission time (used server-side to
 * populate `thumbnailUrl`). Only YouTube yields one without an API call.
 */
export function deriveThumbnail(url: string): string | null {
  return parseVideoUrl(url).thumbnailUrl
}
