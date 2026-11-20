import { describe, expect, it } from 'vitest'
import { danceCardStart, roleFromAnswer } from './danceCard'

describe('danceCardStart (RAZ-1005)', () => {
  it('from a night: its dances first and ticked, then mine; the role from how I signed up', () => {
    expect(danceCardStart({ profileRole: null, profileStyles: ['Salsa'], event: { styles: ['Bachata'], answer: 'needFollower' } }))
      .toEqual({ role: 'lead', ticked: ['Bachata', 'Salsa'], listed: ['Bachata', 'Salsa'] })
  })

  it('the sign-up answer wins over the profile; no role in the answer keeps the profile one', () => {
    expect(danceCardStart({ profileRole: 'lead', profileStyles: [], event: { styles: ['Kizomba'], answer: 'needLeader' } }).role).toBe('follow')
    expect(danceCardStart({ profileRole: 'lead', profileStyles: [], event: { styles: ['Kizomba'], answer: 'partner' } }).role).toBe('lead')
  })

  it('without a night: my dances, then the common ones; nothing new ticked', () => {
    expect(danceCardStart({ profileRole: 'both', profileStyles: ['Timba'] }))
      .toEqual({ role: null, ticked: ['Timba'], listed: ['Timba', 'Salsa', 'Bachata', 'Kizomba', 'Zouk', 'Tango'] })
  })

  it('reads the answer as a role only for a lone leader or follower', () => {
    expect([roleFromAnswer('needFollower'), roleFromAnswer('needLeader'), roleFromAnswer('yes'), roleFromAnswer(null)]).toEqual(['lead', 'follow', null, null])
  })
})
