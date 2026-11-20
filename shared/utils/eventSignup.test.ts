import { describe, expect, it } from 'vitest'
import { chosenPass, passCoverage, fullNameOk, noPassForRole, passFor, passesFor, signupNeedsPhone, passPriceLabel, passTotal, peopleFor, phoneOk, pricedPasses, signupCta, signupState, signupSteps } from './eventSignup'

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
    expect(signupCta([])).toBe('Book my spot')
    expect(signupCta([drop])).toBe('Book my spot · €10')
    expect(signupCta([course, drop])).toBe('Book my spot · from €10')
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

// A festival that sells passes per role, like DDF 2026: single follower passes sold out (none listed).
const ddf = [
  { name: 'Full Pass — Leader', price: 135, days: [] },
  { name: 'Full Pass — Couple (leader + follower)', price: 240, days: [] },
  { name: 'Full Pass — Leader couple (2 leaders)', price: 230, days: [] },
  { name: 'Saturday Social Pass — Single leader', price: 10, days: ['Saturday'] },
  { name: 'Saturday Social Pass — Couple', price: 20, days: ['Saturday'] },
  { name: 'Masterclass: Asia — Musicality', price: 25, days: ['Saturday'] },
]
const names = (ps: { name: string }[]) => ps.map(p => p.name)

describe('passes per role (festivals)', () => {
  it('reads who a pass is for from its name', () => {
    expect(passFor(ddf[0]!)).toBe('leader')
    expect(passFor(ddf[1]!)).toBe('couple')
    expect(passFor(ddf[2]!)).toBe('couple')
    expect(passFor({ name: 'Day pass — Follower' })).toBe('follower')
    expect(passFor(ddf[5]!)).toBeNull()
    expect(passFor(drop)).toBeNull()
  })

  it('offers each way of coming its own passes, plus the ones for anyone', () => {
    expect(names(passesFor(ddf, 'needFollower'))).toEqual(['Full Pass — Leader', 'Saturday Social Pass — Single leader', 'Masterclass: Asia — Musicality'])
    expect(names(passesFor(ddf, 'partner'))).toEqual(['Full Pass — Couple (leader + follower)', 'Full Pass — Leader couple (2 leaders)', 'Saturday Social Pass — Couple', 'Masterclass: Asia — Musicality'])
    expect(names(passesFor(ddf, 'needLeader'))).toEqual(['Masterclass: Asia — Musicality'])
  })

  it('says when no pass is left for a role on its own', () => {
    expect(noPassForRole(ddf, 'needLeader')).toBe(true)
    expect(noPassForRole(ddf, 'needFollower')).toBe(false)
    expect(noPassForRole(ddf, 'partner')).toBe(false)
    expect(noPassForRole([drop, course], 'needLeader')).toBe(false)
  })

  it('keeps every pass of a class that does not sell per role', () => {
    expect(names(passesFor([drop, course], 'needLeader'))).toEqual(['This class', 'Whole course'])
  })

  it('prices a couple pass once for both', () => {
    expect(passTotal(ddf[1]!, 2)).toBe(240)
    expect(passPriceLabel(ddf[1]!, 2)).toBe('€240 for two')
    expect(passTotal(ddf[5]!, 2)).toBe(50)
  })

  it('asks for the pass only when more than one fits, and checks the pick against the role', () => {
    expect(signupSteps({ passes: ddf, answer: 'needLeader' })).toEqual(['role', 'pass', 'pay', 'you'])
    expect(signupSteps({ passes: ddf, answer: 'partner' })).toEqual(['role', 'pass', 'pay', 'you'])
    expect(chosenPass(ddf, 'Full Pass — Leader', 'partner')).toBeNull()
    expect(chosenPass(ddf, 'Full Pass — Couple (leader + follower)', 'partner')?.price).toBe(240)
  })
})

describe('passCoverage: what a pass covers, read from its words when unset', () => {
  const cov = (name: string, description?: string, extra = {}) => {
    const c = passCoverage({ name, description, ...extra })
    return [c.workshopCount, c.includesParty]
  }
  it('reads DDF-style passes', () => {
    expect(cov('Full Pass — Leader', 'All workshops, socials and parties, Friday to Sunday')).toEqual([undefined, true])
    expect(cov('Friday Day Pass — Leader', 'Workshops, social and party on Friday')).toEqual([undefined, true])
    expect(cov('Friday Party Pass — Leader', 'Party only')).toEqual([0, true])
    expect(cov('Party Pass Fri + Sat — Leader', 'Both parties, no workshops, no social')).toEqual([0, true])
    expect(cov('Saturday Social Pass — Single leader', 'Afternoon social only')).toEqual([0, true])
    expect(cov('Masterclass: Asia — Musicality', '1 hour masterclass on musicality')).toEqual([0, false])
  })
  it('never overrides what the organiser set', () => {
    expect(cov('Party Pass', 'Party only', { workshopCount: 2, includesParty: false })).toEqual([2, false])
  })
  it('leaves a plain pass unknown', () => {
    expect(cov('This class')).toEqual([undefined, undefined])
  })
})

describe('signupState: the closed sign-up shows one thing', () => {
  it('no answer → the button', () => {
    expect(signupState(null)).toBe('book')
  })
  it('cancelled ("next") is the button, even on a confirmed row — never "Spot booked" beside it', () => {
    expect(signupState({ answer: 'next', confirmed: true })).toBe('book')
    expect(signupState({ answer: 'next', confirmed: false })).toBe('book')
  })
  it('confirmed → booked; not yet confirmed → the link was sent', () => {
    expect(signupState({ answer: 'needLeader', confirmed: true })).toBe('booked')
    expect(signupState({ answer: 'partner', confirmed: false })).toBe('sent')
  })
})
