import { describe, expect, it } from 'vitest'
import { isFreshFrame, JPEG_STEPS, MAX_SCREENSHOT_BYTES, scaledSize, settleDelayMs } from './screen-capture'

describe('settleDelayMs', () => {
  it('waits briefly for a tab capture (only our own dialog has to go)', () => {
    expect(settleDelayMs('browser')).toBe(400)
  })

  it('waits longer for a window or whole screen, where the browser picker is in the shot (RAZ-976)', () => {
    expect(settleDelayMs('window')).toBeGreaterThan(settleDelayMs('browser'))
    expect(settleDelayMs('monitor')).toBeGreaterThan(settleDelayMs('browser'))
  })

  it('treats an unknown surface (Safari / Firefox report none) like a window', () => {
    expect(settleDelayMs(undefined)).toBe(settleDelayMs('window'))
  })
})

describe('isFreshFrame', () => {
  it('skips frames captured before the screen settled (the picker still showing)', () => {
    expect(isFreshFrame(999, 1000)).toBe(false)
  })

  it('takes frames captured at or after the screen settled', () => {
    expect(isFreshFrame(1000, 1000)).toBe(true)
    expect(isFreshFrame(1500, 1000)).toBe(true)
  })
})

describe('scaledSize', () => {
  it('scales a retina / 4K frame down to the longest edge, keeping the ratio', () => {
    expect(scaledSize(3024, 1964, 1600)).toEqual({ width: 1600, height: 1039 })
    expect(scaledSize(1964, 3024, 1600)).toEqual({ width: 1039, height: 1600 })
  })

  it('never upscales a small frame', () => {
    expect(scaledSize(800, 600, 1600)).toEqual({ width: 800, height: 600 })
  })

  it('has no size for an empty frame', () => {
    expect(scaledSize(0, 600, 1600)).toBeNull()
  })
})

describe('JPEG_STEPS', () => {
  it('starts at most 1600 px and only gets smaller, so a report stays well under a megabyte', () => {
    expect(JPEG_STEPS[0]!.maxEdge).toBeLessThanOrEqual(1600)
    for (let i = 1; i < JPEG_STEPS.length; i++) {
      expect(JPEG_STEPS[i]!.maxEdge).toBeLessThan(JPEG_STEPS[i - 1]!.maxEdge)
      expect(JPEG_STEPS[i]!.quality).toBeLessThanOrEqual(JPEG_STEPS[i - 1]!.quality)
    }
    expect(MAX_SCREENSHOT_BYTES).toBeLessThan(1024 * 1024)
  })
})
