import { describe, expect, it } from 'vitest'
import { artistInviteLines, artistInviteMessage, slotLine, type ArtistInviteFacts } from './artistInvite'

const facts: ArtistInviteFacts = {
  artistName: 'Milaila Capote', host: 'MontunoClub', hostEvents: 12, hostCity: 'Munich', eventName: 'Misterio en Blanco',
  when: 'Saturday 14 November', place: 'Salsea Dance Academy, Munich',
  slots: [
    { date: '2026-11-14', time: '10:00', title: 'Lady Styling', type: 'workshop' },
    { date: '2026-11-14', time: '11:00', title: 'Rumba', type: 'workshop' },
  ],
  dayLabels: { '2026-11-14': 'Sat' }, flyer: 'pictured',
}

describe('artistInviteMessage', () => {
  it('says what the organizer offers when there is an offer, and nothing about money otherwise', () => {
    expect(artistInviteMessage({ ...facts, offer: '€80 per class + Free pass' }, 'u')).toContain('💶 We offer: €80 per class + Free pass')
    expect(artistInviteMessage(facts, 'u')).not.toContain('💶')
    expect(artistInviteLines({ ...facts, offer: '€80 per class' })).toContain('MontunoClub offer: €80 per class')
  })
  it('says when, where, their classes and the flyer before the link', () => {
    const m = artistInviteMessage(facts, 'https://x/confirm/t')
    expect(m).toContain("Hi Milaila! This is MontunoClub: we've organised 12 dance events in Munich.")
    expect(m).toContain("You're in the line-up of Misterio en Blanco:")
    expect(m).toContain('📅 Saturday 14 November · Salsea Dance Academy, Munich')
    expect(m).toContain('🕒 Your classes: 10:00 Lady Styling · 11:00 Rumba')
    expect(m).toContain('🎨 The flyer is ready, with your name and photo')
    expect(m).toContain("Could you confirm you're in, and check your classes and how the flyer shows you (you can change your photo there)? It takes a minute: https://x/confirm/t")
    expect(m.trim().endsWith('https://x/confirm/t')).toBe(true)
  })
  it('without slots or flyer, says so and skips the flyer line', () => {
    const m = artistInviteMessage({ ...facts, slots: [], flyer: null, hostEvents: 0 }, 'u')
    expect(m).toContain('Your slot isn’t in the programme yet')
    expect(m).not.toMatch(/🎨|organised|flyer/)
    expect(m).toContain("Could you confirm you're in, and check your slot?")
    expect(m).not.toContain('\n\n\n')
  })
  it('calls a DJ set a slot and names the day over several days', () => {
    const f = { ...facts, slots: [{ date: '2026-11-14', time: '21:00', title: '', type: 'party' }, { date: '2026-11-15', time: '22:00', title: 'Closing set', type: 'party' }], dayLabels: { '2026-11-14': 'Sat', '2026-11-15': 'Sun' } }
    expect(artistInviteMessage(f, 'u')).toContain('🕒 Your slots: Sat 21:00 party · Sun 22:00 Closing set')
  })
  it('shortens a long list', () => {
    const slots = Array.from({ length: 7 }, (_, i) => ({ date: '2026-11-14', time: `1${i}:00`, title: `C${i}`, type: 'workshop' }))
    expect(artistInviteMessage({ ...facts, slots }, 'u')).toContain('13:00 C3 · +3 more')
  })
})

describe('email lines', () => {
  it('lists the place, every slot and the flyer', () => {
    expect(artistInviteLines(facts)).toEqual(['Salsea Dance Academy, Munich', 'Your classes: 10:00 Lady Styling · 11:00 Rumba', 'The flyer is ready, with your name and photo'])
  })
  it('names a workshop without a title by its style', () => {
    expect(slotLine({ date: 'd', time: '19:30', title: '', type: 'workshop', style: 'Salsa' })).toBe('19:30 Salsa workshop')
  })
})
