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

/** "With my partner" / "With a friend" is two people. */
export function peopleFor(answer: RsvpAnswer | null | undefined): 1 | 2 {
  return answer === 'partner' ? 2 : 1
}

/** What a pass costs for the people coming, in euros. */
export function passTotal(pass: Pick<FestivalPass, 'price' | 'couplePrice'>, people: 1 | 2): number {
  const price = Number(pass.price) || 0
  if (people === 1) return price
  const couple = Number(pass.couplePrice)
  return pass.couplePrice != null && Number.isFinite(couple) && couple > 0 ? couple : price * 2
}

/** "€18 for two", "2 × €129", "€10". */
export function passPriceLabel(pass: Pick<FestivalPass, 'price' | 'couplePrice'>, people: 1 | 2): string {
  const total = passTotal(pass, people)
  if (people === 1) return `€${total}`
  return pass.couplePrice != null && Number(pass.couplePrice) > 0 ? `€${total} for two` : `2 × €${Number(pass.price)}`
}

/** The steps, in order, for this event and this viewer. */
export function signupSteps(o: { passes: readonly FestivalPass[] }): SignupStep[] {
  const priced = pricedPasses(o.passes)
  return [
    'role',
    ...(priced.length > 1 ? ['pass' as const] : []),
    ...(priced.length ? ['pay' as const] : []),
    'you',
  ]
}

/** The pass the dancer means: the one they picked, or the only one there is. */
export function chosenPass(passes: readonly FestivalPass[], name: string | null | undefined): FestivalPass | null {
  const priced = pricedPasses(passes)
  if (name) return priced.find(p => p.name.trim() === name.trim()) ?? null
  return priced.length === 1 ? priced[0]! : null
}

/** The button: "Sign up · €10", "Sign up · from €18", "I'm coming". */
export function signupCta(passes: readonly FestivalPass[]): string {
  const priced = pricedPasses(passes)
  if (!priced.length) return 'I’m coming'
  const min = Math.min(...priced.map(p => Number(p.price)))
  return priced.length > 1 ? `Sign up · from €${min}` : `Sign up · €${min}`
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
