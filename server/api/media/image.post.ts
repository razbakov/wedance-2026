import { defineEventHandler, readMultipartFormData, getQuery, getCookie, getHeader, getRequestURL, createError } from 'h3'
import { and, eq, gt } from 'drizzle-orm'
import cloudinary from 'cloudinary'
import { useDb } from '../../utils/db'
import { sessions } from '../../database/schema'
import { localImageFallbackAllowed, saveLocalImage } from '../../utils/localImage'

// Allowed Cloudinary sub-folders (?folder=…); anything else falls back to avatars.
const FOLDERS = new Set(['avatars', 'profiles', 'events', 'flyers', 'sites'])
/** Preview disk, not Cloudinary: a phone photo, not a flyer original. */
const LOCAL_MAX = 8 * 1024 * 1024

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const configured = !!(config.cloudinaryApiKey && config.cloudinaryApiSecret && config.public.cloudinaryCloudName)

  // Production keeps the Cloudinary upload, or the same "not configured" error
  // when the keys are missing. Previews and local dev store the file here.
  if (!configured) {
    if (!localImageFallbackAllowed({
      vercelEnv: process.env.VERCEL_ENV,
      siteUrl: config.siteUrl,
    })) {
      throw createError({ statusCode: 503, statusMessage: 'Image upload is not configured.' })
    }
    if (!(await hasSession(event))) {
      throw createError({ statusCode: 401, statusMessage: 'Sign in to upload a photo.' })
    }
    const file = await readImage(event)
    if (file.data.length > LOCAL_MAX) {
      throw createError({ statusCode: 413, statusMessage: 'Image must be under 8 MB.' })
    }
    let saved: { id: string }
    try {
      saved = saveLocalImage(file.data)
    } catch {
      throw createError({ statusCode: 400, statusMessage: 'Please choose a JPEG, PNG, WebP or GIF.' })
    }
    const url = `${publicOrigin(event)}/api/media/file/${saved.id}`
    return { url }
  }

  cloudinary.v2.config({
    cloud_name: config.public.cloudinaryCloudName,
    api_key: config.cloudinaryApiKey,
    api_secret: config.cloudinaryApiSecret,
  })

  const file = await readImage(event)
  const requested = String(getQuery(event).folder ?? '')
  const folder = FOLDERS.has(requested) ? requested : 'avatars'

  const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
    const stream = cloudinary.v2.uploader.upload_stream(
      { folder: `wedance-2026/${folder}` },
      (error, result) => {
        if (error) reject(error)
        else resolve(result as { secure_url: string })
      },
    )
    stream.end(file.data)
  })

  return { url: uploadResult.secure_url }
})

/** Prefer the configured public https origin so a photo URL isn't http behind the proxy. */
function publicOrigin(event: Parameters<typeof getQuery>[0]): string {
  const site = useRuntimeConfig().siteUrl
  if (typeof site === 'string' && /^https:\/\//.test(site)) return site.replace(/\/$/, '')
  return getRequestURL(event).origin
}

async function readImage(event: Parameters<typeof getQuery>[0]) {
  const formData = await readMultipartFormData(event)
  if (!formData) throw createError({ statusCode: 400, statusMessage: 'No form data provided.' })
  const fileField = formData.find((f) => f.name === 'file')
  if (!fileField || !fileField.data) throw createError({ statusCode: 400, statusMessage: 'No file uploaded.' })
  return fileField
}

/** The web session cookie (or the same Bearer token tRPC uses). */
async function hasSession(event: Parameters<typeof getQuery>[0]): Promise<boolean> {
  const header = getHeader(event, 'authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : getCookie(event, 'wedance-session')
  if (!token) return false
  const db = useDb()
  const [row] = await db
    .select({ dancerId: sessions.dancerId })
    .from(sessions)
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1)
  return !!row
}
