import { describe, expect, it } from 'vitest'
import { KEEP_POPUPS_OPEN, isKeepOpenTarget, keepPopupsOpen } from './popup-layers'

/** A stand-in element: `closest` finds the marker on itself or an ancestor. */
function el(marked: boolean, parent?: { marked: boolean }) {
  const chain = [marked, parent?.marked ?? false]
  return { closest: (sel: string) => (sel === `[${KEEP_POPUPS_OPEN}]` && chain.some(Boolean) ? {} : null) }
}

function outside(target: unknown) {
  let prevented = false
  keepPopupsOpen({ detail: { originalEvent: { target } }, preventDefault: () => { prevented = true } } as never)
  return prevented
}

describe('popup layers (RAZ-992)', () => {
  it('keeps popups open for the "Talk to us" trigger and anything inside it', () => {
    expect(isKeepOpenTarget(el(true) as never)).toBe(true)
    expect(isKeepOpenTarget(el(false, { marked: true }) as never)).toBe(true)
    expect(outside(el(false, { marked: true }))).toBe(true)
  })

  it('lets every other outside click close the popup', () => {
    expect(isKeepOpenTarget(el(false) as never)).toBe(false)
    expect(isKeepOpenTarget(null)).toBe(false)
    expect(isKeepOpenTarget({} as never)).toBe(false)
    expect(outside(el(false))).toBe(false)
  })
})
