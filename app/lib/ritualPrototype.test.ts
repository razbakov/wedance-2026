import { describe, expect, it } from 'vitest'
import {
  DEMO_COUNTDOWN_SECONDS,
  PARTNER_MARK,
  PARTNER_QR,
  RITUAL,
  RITUAL_STEPS,
  VENUE_QR,
  YOU_MARK,
  canJoin,
  formatCountdown,
  joinHint,
  nameList,
  nextStep,
  prevStep,
  qrCells,
  ritualCopy,
  showsSymbol,
  stepNumber,
  tickCountdown,
} from './ritualPrototype'

describe('ritual prototype journey', () => {
  it('walks one path from the Meet card to the deck, with a way back', () => {
    expect(RITUAL_STEPS[0]).toBe('match')
    expect(RITUAL_STEPS.at(-1)).toBe('done')
    let step = RITUAL_STEPS[0]
    const seen = [step]
    while (nextStep(step)) {
      step = nextStep(step)!
      seen.push(step)
    }
    expect(seen).toEqual([...RITUAL_STEPS])
    expect(nextStep('done')).toBeNull()
    expect(prevStep('match')).toBeNull()
    expect(prevStep('reveal')).toBe('waiting')
    expect(stepNumber('reveal')).toBe(6)
  })

  it('keeps the color and shape hidden until the reveal', () => {
    for (const step of RITUAL_STEPS) {
      const hidden = ['match', 'scan', 'optin', 'here', 'waiting'].includes(step)
      expect(showsSymbol(step)).toBe(!hidden)
    }
  })

  it('counts down to the reveal and prints the clock', () => {
    expect(tickCountdown(DEMO_COUNTDOWN_SECONDS)).toEqual({ seconds: 19, reveal: false })
    expect(tickCountdown(1)).toEqual({ seconds: 0, reveal: true })
    expect(tickCountdown(0)).toEqual({ seconds: 0, reveal: true })
    expect(formatCountdown(20)).toBe('0:20')
    expect(formatCountdown(0)).toBe('0:00')
    expect(formatCountdown(75)).toBe('1:15')
  })

  it('joins only after the 18+ confirm and the two other ticks', () => {
    const open = { adult: false, leave: false, stay: false }
    expect(canJoin(open)).toBe(false)
    expect(joinHint(open, 'en')).toMatch(/18/)
    expect(joinHint({ ...open, adult: true }, 'de')).toMatch(/Haken/)
    expect(canJoin({ adult: true, leave: true, stay: true })).toBe(true)
    expect(joinHint({ adult: true, leave: true, stay: true }, 'en')).toBeNull()
  })

  it('speaks German first and English with the lines the journey is named for', () => {
    const de = ritualCopy('de')
    const en = ritualCopy('en')
    expect(Object.keys(de).sort()).toEqual(Object.keys(en).sort())
    expect(en.seeYou).toBe('See you at La Timberia')
    expect(en.looking).toBe('You’re looking for Mary.')
    expect(en.metTitle).toBe('You met Mary!')
    expect(en.dance).toBe('Dance this song together')
    expect(en.dancedCard).toBe('I danced with Mary')
    expect(en.holdTitle).toBe('Hold your phone up at the DJ')
    expect(de.seeYou).toContain('La Timberia')
    expect(de.looking).toContain('Mary')
    expect(de.metNames).toBe('Mary und Lena')
    expect(nameList(RITUAL.matches, 'de')).toBe('Mary, Jonas und Elena')
    expect(nameList(RITUAL.matches, 'en')).toBe('Mary, Jonas and Elena')
    const before = [de.scanBody, de.hereHidden, de.waitingHint, de.matchBody, en.hereHidden, en.waitingHint].join(' ')
    expect(before).not.toMatch(/Stern|star 17/)
  })

  it('pairs two phones on one symbol and uses fake QR grids', () => {
    expect(YOU_MARK.number).toBe(PARTNER_MARK.number)
    expect(YOU_MARK.shape).toBe(PARTNER_MARK.shape)
    expect(YOU_MARK.color).toBe(PARTNER_MARK.color)
    expect(YOU_MARK.code).not.toBe(PARTNER_MARK.code)
    for (const rows of [VENUE_QR, PARTNER_QR]) {
      expect(qrCells(rows)).toHaveLength(121)
      expect(rows.every(row => row.length === 11)).toBe(true)
    }
    expect(qrCells(VENUE_QR).join('')).not.toBe(qrCells(PARTNER_QR).join(''))
  })
})
