import { describe, it, expect } from 'vitest'
import { answerLines, answerSubjects, type InviteAnswerFacts } from './inviteAnswer'
import { venueTermsText } from '../types/venueAsk'

const base: InviteAnswerFacts = {
  kind: 'artist', status: 'confirmed', profileName: 'Milaila Capote', eventName: 'Misterio en Blanco',
  when: 'Saturday 6 December 2026 · 20:00', place: 'Salsea, Munich', offer: '€80 per class', terms: '',
  alternative: '', programmeNote: '', message: '', flyerName: '',
}

describe('answerSubjects', () => {
  it('says who is in, to both sides', () => {
    expect(answerSubjects(base)).toEqual({ you: 'You’re in for Misterio en Blanco', them: 'Milaila Capote is in for Misterio en Blanco' })
  })
  it('a venue suggesting another date', () => {
    expect(answerSubjects({ ...base, kind: 'venue', status: 'proposed', profileName: 'Salsea' }).them).toBe('Salsea suggests another date for Misterio en Blanco')
  })
  it('an artist saying no', () => {
    expect(answerSubjects({ ...base, status: 'declined' }).you).toBe('You can’t make it to Misterio en Blanco')
  })
})

describe('answerLines', () => {
  it('lists the deal, the flyer name and notes', () => {
    const lines = answerLines({ ...base, terms: 'Fee €120 per class', flyerName: 'Milaila', programmeNote: 'Sunday not Saturday', message: 'See you!' })
    expect(lines).toEqual([
      '🗓 Saturday 6 December 2026 · 20:00', '📍 Salsea, Munich', '💶 Offered: €80 per class', '🤝 Terms: Fee €120 per class',
      '🪧 On the flyer as: Milaila', '✏️ Programme: Sunday not Saturday', '💬 See you!',
    ])
  })
  it('a no keeps only the date, place and their message', () => {
    expect(answerLines({ ...base, status: 'declined', terms: 'x', message: 'Sorry' })).toEqual(['🗓 Saturday 6 December 2026 · 20:00', '📍 Salsea, Munich', '💬 Sorry'])
  })
})

describe('venueTermsText', () => {
  it('joins what they set', () => {
    expect(venueTermsText({ rent: '€300', includes: ['Bar staff', 'Security'], capacity: 120 })).toBe('Rent €300 · Includes Bar staff, Security · Up to 120')
    expect(venueTermsText(null)).toBe('')
  })
})
