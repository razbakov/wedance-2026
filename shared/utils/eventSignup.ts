/**
 * Signing up for a class, course or event (RAZ-995): one button opens the steps
 * in place, and each step is asked only when it is needed:
 *
 *   role    How are you coming? — the poll's answers (shared/utils/rsvp.ts)
 *   pass    Pick your pass — only when there is more than one priced pass
 *   pay     Pay now, or at the door when the organiser allows it
 *   you     Your contact: name, email, phone (signed out) · a review (signed in)
 *
 * With my partner = two people: a pass's couple price, else 2 × its price.
 * The organiser gets name, email and phone for THIS event (changes, its
 * WhatsApp group); "tell me about next ones" is a separate, unticked opt-in.
 * Pure — the server checks the same rules again (rsvp.signUp).
 */
import type { FestivalPass } from '../types/festivalDetails'
import type { RsvpAnswer } from './rsvp'

export type SignupStep = 'role' | 'pass' | 'pay' | 'you'
export type PayMethod = 'now' | 'door'

/** Passes that cost something (a €0 pass is free entry, not a checkout). */
export function pricedPasses(passes: readonly FestivalPass[] | null | undefined): FestivalPass[] {
  return (passes ?? []).filter(p => p.name?.trim() && Number(p.price) > 0)
}

/**
 * What the closed sign-up shows — exactly one of: the "Book my spot" button, "Spot booked",
 * or "Almost there: open the link". Not coming (no answer, or "next" after "Cancel my spot")
 * is always the button, even when the cancelled answer is a confirmed row.
 */
export function signupState(mine: { answer: RsvpAnswer, confirmed: boolean } | null | undefined): 'book' | 'booked' | 'sent' {
  if (!mine || mine.answer === 'next') return 'book'
  return mine.confirmed ? 'booked' : 'sent'
}

/** "With my partner" / "With a friend" is two people. */
export function peopleFor(answer: RsvpAnswer | null | undefined): 1 | 2 {
  return answer === 'partner' ? 2 : 1
}

/**
 * Who a pass is for, read from its name: festivals sell "Full Pass — Leader", "… — Couple",
 * "… — Leader couple (2 leaders)" as separate passes. null = anyone (a masterclass, a class's
 * only pass). A couple pass is for two people and its price is for both.
 */
export type PassFor = 'leader' | 'follower' | 'couple'
export function passFor(pass: Pick<FestivalPass, 'name'>): PassFor | null {
  const n = String(pass.name ?? '').toLowerCase()
  if (/\bcouples?\b|\bfor two\b|\bpaar\b|\bpareja\b|\(2 /.test(n)) return 'couple'
  if (/\bleaders?\b/.test(n)) return 'leader'
  if (/\bfollowers?\b/.test(n)) return 'follower'
  return null
}

/**
 * The passes that fit how the dancer is coming. Only when the organiser sells passes per role:
 * with a partner → couple passes (and passes for anyone, ×2); alone → their role's passes (and
 * passes for anyone). A class with plain passes keeps all of them.
 */
export function passesFor(passes: readonly FestivalPass[], answer: RsvpAnswer | null | undefined): FestivalPass[] {
  const priced = pricedPasses(passes)
  if (!answer || !priced.some(p => passFor(p))) return priced
  const want: PassFor | null = answer === 'partner' ? 'couple' : answer === 'needLeader' ? 'follower' : answer === 'needFollower' ? 'leader' : null
  return priced.filter((p) => {
    const f = passFor(p)
    if (!f) return true
    if (want) return f === want
    return f !== 'couple' // "I'm going" in a dance without roles: any single pass
  })
}

/** The roles' passes the organiser sells but none of them is for this dancer ("no follower passes left"). */
export function noPassForRole(passes: readonly FestivalPass[], answer: RsvpAnswer | null | undefined): boolean {
  if (answer !== 'needLeader' && answer !== 'needFollower') return false
  const priced = pricedPasses(passes)
  const want: PassFor = answer === 'needLeader' ? 'follower' : 'leader'
  const perRole = priced.some(p => passFor(p) === 'leader' || passFor(p) === 'follower')
  return perRole && !priced.some(p => passFor(p) === want && !p.soldOut)
}

/**
 * What a pass covers, when the organiser didn't say (workshopCount / includesParty unset): read from
 * its name and description. Without this an unset pass reads as "every workshop", so a party pass or
 * a masterclass was suggested for a plan of workshops. Set fields always win.
 * workshopCount 0 = no workshops; undefined = all of them.
 */
export function passCoverage<P extends Pick<FestivalPass, 'name' | 'description' | 'workshopCount' | 'includesParty'>>(pass: P): P {
  const text = `${pass.name ?? ''} ${pass.description ?? ''}`.toLowerCase()
  const masterclass = /masterclass/.test(text)
  const noWorkshops = masterclass || /\bno workshops?\b|\b(party|parties|social|socials) only\b|\b(party|social) pass\b/.test(text)
  const party = /\bno (party|parties)\b/.test(text) ? false
    : masterclass && !/\bpart(y|ies)\b/.test(text) ? false
    : /\bpart(y|ies)\b|\bsocials?\b/.test(text) ? true : undefined
  return {
    ...pass,
    workshopCount: pass.workshopCount ?? (noWorkshops ? 0 : undefined),
    includesParty: pass.includesParty ?? party,
  }
}

/** What a pass costs for the people coming, in euros. */
export function passTotal(pass: Pick<FestivalPass, 'name' | 'price' | 'couplePrice'>, people: 1 | 2): number {
  const price = Number(pass.price) || 0
  if (people === 1 || passFor(pass) === 'couple') return price
  const couple = Number(pass.couplePrice)
  return pass.couplePrice != null && Number.isFinite(couple) && couple > 0 ? couple : price * 2
}

/** "€18 for two", "2 × €129", "€10". */
export function passPriceLabel(pass: Pick<FestivalPass, 'name' | 'price' | 'couplePrice'>, people: 1 | 2): string {
  const total = passTotal(pass, people)
  if (people === 1) return `€${total}`
  if (passFor(pass) === 'couple') return `€${total} for two`
  return pass.couplePrice != null && Number(pass.couplePrice) > 0 ? `€${total} for two` : `2 × €${Number(pass.price)}`
}

/** The steps, in order, for this event and this viewer. */
export function signupSteps(o: { passes: readonly FestivalPass[], answer?: RsvpAnswer | null }): SignupStep[] {
  const fitting = passesFor(o.passes, o.answer)
  const priced = o.answer && fitting.length ? fitting : pricedPasses(o.passes)
  // No pass left for their role: show the step anyway, so they see why (and what is left).
  return [
    'role',
    ...(priced.length > 1 || noPassForRole(o.passes, o.answer) ? ['pass' as const] : []),
    ...(priced.length ? ['pay' as const] : []),
    'you',
  ]
}

/** The pass the dancer means: the one they picked, or the only one there is. */
export function chosenPass(passes: readonly FestivalPass[], name: string | null | undefined, answer?: RsvpAnswer | null): FestivalPass | null {
  const priced = answer ? passesFor(passes, answer) : pricedPasses(passes)
  if (name) return priced.find(p => p.name.trim() === name.trim()) ?? null
  return priced.length === 1 ? priced[0]! : null
}

/** The button, always "Book my spot" (RAZ-1003; pairs with "Cancel my spot"): "Book my spot · €10", "… · from €18". */
export function signupCta(passes: readonly FestivalPass[]): string {
  const priced = pricedPasses(passes)
  if (!priced.length) return 'Book my spot'
  const min = Math.min(...priced.map(p => Number(p.price)))
  return priced.length > 1 ? `Book my spot · from €${min}` : `Book my spot · €${min}`
}

/** The price a sign-up costs, for a link elsewhere ("Book · €10 →" on My plan, RAZ-1003); null = free. */
export function signupPrice(passes: readonly FestivalPass[] | null | undefined): string | null {
  const priced = pricedPasses(passes ?? [])
  if (!priced.length) return null
  const min = Math.min(...priced.map(p => Number(p.price)))
  return priced.length > 1 ? `from €${min}` : `€${min}`
}

/** Event types that are classes (the organiser runs a group, sends changes). */
export const CLASS_EVENT_TYPES = ['class', 'course', 'practica', 'workshop'] as const

/**
 * The phone is part of signing up for a class, a course or anything paid: the organiser needs it for
 * changes and the class's WhatsApp group. For a party night it stays optional, so "I'm going" stays light.
 */
export function signupNeedsPhone(o: { type?: string | null, passes?: readonly FestivalPass[] | null }): boolean {
  return pricedPasses(o.passes).length > 0 || (CLASS_EVENT_TYPES as readonly string[]).includes(String(o.type ?? '').toLowerCase())
}

export const PHONE_MIN_DIGITS = 7
export const PHONE_MAX = 40

/** A phone the organiser can call or add to WhatsApp: at least 7 digits. */
export function phoneOk(phone: string | null | undefined): boolean {
  return String(phone ?? '').replace(/\D/g, '').length >= PHONE_MIN_DIGITS
}

/** First and last name, as the organiser will see it. */
export function fullNameOk(name: string | null | undefined): boolean {
  return String(name ?? '').trim().split(/\s+/).filter(Boolean).length >= 2
}
