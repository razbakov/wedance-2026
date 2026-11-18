import { defineEventHandler, getRouterParam, setHeader, createError } from 'h3'
import { readLocalImage } from '../../../utils/localImage'

/** A photo stored by the preview fallback (server/utils/localImage.ts). */
export default defineEventHandler((event) => {
  const found = readLocalImage(getRouterParam(event, 'id'))
  if (!found) throw createError({ statusCode: 404, statusMessage: 'Not found.' })
  setHeader(event, 'Content-Type', found.type)
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
  return found.bytes
})
