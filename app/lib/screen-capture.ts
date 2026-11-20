/**
 * One-frame screenshot via the browser's own screen capture
 * (navigator.mediaDevices.getDisplayMedia) — used by the "Report a problem"
 * form (app/components/ReportProblem.vue).
 *
 * The browser shows its own permission prompt; Chrome/Edge pre-select the
 * current tab (`preferCurrentTab`). We take ONE frame and stop every track
 * straight away, so the "sharing this tab" indicator disappears. Mobile
 * browsers have no getDisplayMedia — there the report relies on Sentry Replay.
 *
 * getDisplayMedia needs a user gesture: call `captureScreenFrame()` directly
 * from a click handler, with no `await` before it. The call itself is the
 * first statement here, so it runs synchronously inside that gesture.
 */

export interface ScreenFrame {
  /** JPEG bytes, ready to attach to the Sentry feedback event. */
  bytes: Uint8Array
  /** Blob of the same bytes, for an <img> preview via URL.createObjectURL. */
  blob: Blob
}

/**
 * How the frame is stored: tried in order until the JPEG fits MAX_SCREENSHOT_BYTES.
 * A retina / 4K frame is scaled down to the longest edge, so a report stays a
 * few hundred KB however big the screen is (RAZ-976).
 */
export const JPEG_STEPS: ReadonlyArray<{ maxEdge: number, quality: number }> = [
  { maxEdge: 1600, quality: 0.75 },
  { maxEdge: 1280, quality: 0.6 },
  { maxEdge: 960, quality: 0.5 },
]
/** Upper bound for the attached screenshot. */
export const MAX_SCREENSHOT_BYTES = 800 * 1024

/** Pixel size of a w×h frame scaled so its longest edge is at most maxEdge (never upscaled). */
export function scaledSize(w: number, h: number, maxEdge: number): { width: number, height: number } | null {
  if (!w || !h) return null
  const scale = Math.min(1, maxEdge / Math.max(w, h))
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) }
}

export function isScreenCaptureSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getDisplayMedia === 'function'
}

/**
 * How long to let the screen settle after the user picked a surface, before a
 * frame counts as "the page". A tab capture only has our own dialog to wait
 * for; a window / whole-screen capture (Safari, Firefox, or "Entire screen" in
 * Chrome's full picker) also contains the browser's share picker fading out
 * and its "you are sharing" overlay — RAZ-976: the shot showed that picker.
 */
export function settleDelayMs(surface: string | undefined): number {
  return surface === 'browser' ? 400 : 1200
}

/**
 * A frame is fresh when it was captured after the screen settled. Screen
 * capture delivers frames only when something changes, so the first frames of
 * a stream are often the moment the picker was clicked — those must be
 * skipped. `captureTime` (Chromium) or the callback time stands in when the
 * browser gives no capture timestamp.
 */
export function isFreshFrame(frameTime: number, settledAt: number): boolean {
  return frameTime >= settledAt
}

/** Frames to see after the screen settled before drawing one. */
const FRESH_FRAMES = 2
/** Static screens may send no new frame; draw the latest one after this. */
const FRESH_FRAME_TIMEOUT_MS = 1500

/**
 * Ask for a capture, grab one frame, stop the stream. Resolves `null` (never
 * throws) when capture is unsupported, declined or fails.
 *
 * `settle` runs after the user has picked a surface and before the frame is
 * grabbed — the caller uses it to wait until its own dialog is gone. On top
 * of that we wait `settleDelayMs` for the browser's picker to close, then
 * take a frame captured after that moment, never one queued before it.
 */
export async function captureScreenFrame(settle?: () => Promise<void>): Promise<ScreenFrame | null> {
  if (!isScreenCaptureSupported()) return null
  let stream: MediaStream | null = null
  const video = document.createElement('video')
  try {
    // Must stay the first awaited call (user-gesture requirement).
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: 'browser' },
      audio: false,
      preferCurrentTab: true,
      selfBrowserSurface: 'include',
      surfaceSwitching: 'exclude',
    } as DisplayMediaStreamOptions)
    const track = stream.getVideoTracks()[0]
    if (!track) return null
    // Play the stream straight away so the <video> always holds the newest
    // frame — stale frames from the picker get replaced, not queued.
    await startVideo(video, stream)
    const surface = (track.getSettings() as { displaySurface?: string }).displaySurface
    await Promise.all([settle?.(), wait(settleDelayMs(surface))])
    await waitForFreshFrames(video, performance.now())
    const frame = snapshot(video)
    stopAll(stream)
    stream = null
    return frame ? await encodeFrame(frame) : null
  } catch (e) {
    // NotAllowedError = the user declined; anything else is a browser quirk.
    if ((e as DOMException)?.name !== 'NotAllowedError') console.warn('[screen-capture] failed:', e)
    return null
  } finally {
    video.pause()
    video.srcObject = null
    if (stream) stopAll(stream)
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function stopAll(stream: MediaStream) {
  for (const t of stream.getTracks()) t.stop()
}

/** Play the stream in a detached, muted <video> until it has a first frame. */
async function startVideo(video: HTMLVideoElement, stream: MediaStream): Promise<void> {
  video.muted = true
  video.playsInline = true
  video.srcObject = stream
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('video frame timeout')), 5000)
    video.addEventListener('loadeddata', () => { clearTimeout(timer); resolve() }, { once: true })
    video.play().catch(() => { /* loadeddata still fires for a muted stream */ })
  })
}

type FrameCallbackVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: (now: number, meta: { captureTime?: number }) => void) => number
  cancelVideoFrameCallback?: (handle: number) => void
}

/**
 * Resolve once FRESH_FRAMES frames captured after `settledAt` have been shown,
 * or after FRESH_FRAME_TIMEOUT_MS (a static screen sends no new frames — the
 * <video> then already shows the latest one).
 */
function waitForFreshFrames(video: HTMLVideoElement, settledAt: number): Promise<void> {
  const v = video as FrameCallbackVideo
  return new Promise((resolve) => {
    let seen = 0
    let handle = 0
    const done = () => {
      clearTimeout(timer)
      if (handle && v.cancelVideoFrameCallback) v.cancelVideoFrameCallback(handle)
      resolve()
    }
    const timer = setTimeout(done, FRESH_FRAME_TIMEOUT_MS)
    if (typeof v.requestVideoFrameCallback !== 'function') {
      // No frame callbacks (old Firefox): two paints after settling.
      requestAnimationFrame(() => requestAnimationFrame(done))
      return
    }
    const onFrame = (now: number, meta: { captureTime?: number }) => {
      if (isFreshFrame(meta.captureTime ?? now, settledAt)) seen++
      if (seen >= FRESH_FRAMES) return done()
      handle = v.requestVideoFrameCallback!(onFrame)
    }
    handle = v.requestVideoFrameCallback(onFrame)
  })
}

/** Copy the current video frame at full size, so the stream can stop before encoding. */
function snapshot(video: HTMLVideoElement): HTMLCanvasElement | null {
  const size = scaledSize(video.videoWidth, video.videoHeight, Number.POSITIVE_INFINITY)
  if (!size) return null
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  canvas.getContext('2d')?.drawImage(video, 0, 0, size.width, size.height)
  return canvas
}

/** Scale + JPEG-encode, stepping down until the file fits MAX_SCREENSHOT_BYTES. */
async function encodeFrame(source: HTMLCanvasElement): Promise<ScreenFrame | null> {
  let last: Blob | null = null
  for (const step of JPEG_STEPS) {
    const size = scaledSize(source.width, source.height, step.maxEdge)
    if (!size) return null
    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    canvas.getContext('2d')?.drawImage(source, 0, 0, size.width, size.height)
    last = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', step.quality))
    if (last && last.size <= MAX_SCREENSHOT_BYTES) break
  }
  if (!last) return null
  return { blob: last, bytes: new Uint8Array(await last.arrayBuffer()) }
}
