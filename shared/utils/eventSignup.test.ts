import { describe, expect, it } from 'vitest'
import { chosenPass, fullNameOk, signupNeedsPhone, passPriceLabel, passTotal, peopleFor, phoneOk, pricedPasses, signupCta, signupSteps } from './eventSignup'

const drop = { name: 'This class', price: 10, days: [], couplePrice: 18 }
const course = { name: 'Whole course', price: 60, days: [], couplePrice: 110 }
const full = { name: 'Full pass', price: 129, days: [] }
const free = { name: 'Free entry', price: 0, days: [] }

describe('eventSignup', () => {
  it('asks for a pass only when there is a choice, and to pay only when something costs money', () => {
    expect(signupSteps({ passes: [] })).toEqual(['role', 'you'])
    expect(signupSteps({ passes: [free] })).toEqual(['role', 'you'])
    expect(signupSteps({ passes: [drop] })).toEqual(['role', 'pay', 'you'])
    expect(signupSteps({ passes: [course, drop] })).toEqual(['role', 'pass', 'pay', 'you'])
  })

  it('prices two people at the couple price, else twice the price', () => {
    expect(peopleFor('partner')).toBe(2)
    expect(peopleFor('needLeader')).toBe(1)
    expect(passTotal(drop, 1)).toBe(10)
    expect(passTotal(drop, 2)).toBe(18)
    expect(passTotal(full, 2)).toBe(258)
    expect(passPriceLabel(drop, 2)).toBe('€18 for two')
    expect(passPriceLabel(full, 2)).toBe('2 × €129')
    expect(passPriceLabel(full, 1)).toBe('€129')
  })

  it('a €0 couple price falls back to twice the price', () => {
    expect(passTotal({ price: 20, couplePrice: 0 }, 2)).toBe(40)
  })

  it('picks the only pass, or the named one', () => {
    expect(chosenPass([drop], null)?.name).toBe('This class')
    expect(chosenPass([course, drop], null)).toBeNull()
    expect(chosenPass([course, drop], 'Whole course')?.price).toBe(60)
    expect(chosenPass([course, drop], 'Nope')).toBeNull()
    expect(pricedPasses([free, drop])).toHaveLength(1)
  })

  it('labels the button with the price', () => {
    expect(signupCta([])).toBe('I’m coming')
    expect(signupCta([drop])).toBe('Sign up · €10')
    expect(signupCta([course, drop])).toBe('Sign up · from €10')
  })

  it('asks for a phone for classes and anything paid, not for a party night', () => {
    expect(signupNeedsPhone({ type: 'class', passes: [] })).toBe(true)
    expect(signupNeedsPhone({ type: 'Course' })).toBe(true)
    expect(signupNeedsPhone({ type: 'party', passes: [drop] })).toBe(true)
    expect(signupNeedsPhone({ type: 'party', passes: [free] })).toBe(false)
    expect(signupNeedsPhone({ type: null })).toBe(false)
  })

  it('checks phone and full name', () => {
    expect(phoneOk('+49 171 1234567')).toBe(true)
    expect(phoneOk('12345')).toBe(false)
    expect(phoneOk(null)).toBe(false)
    expect(fullNameOk('Maria Lopez')).toBe(true)
    expect(fullNameOk('Maria')).toBe(false)
    expect(fullNameOk('  ')).toBe(false)
  })
})
