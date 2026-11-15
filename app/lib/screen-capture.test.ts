import { describe, expect, it } from 'vitest'
import { isFreshFrame, settleDelayMs } from './screen-capture'

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
