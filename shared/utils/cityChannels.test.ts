import { describe, it, expect } from 'vitest'
import { cityPageHandle, inviteKey, inviteUrlError, platformOf, telegramNameOf } from './communityGroups'
import { buildScheduleText, defaultWeekStart, isWeekStart, pickedByDefault, scheduleDays, scheduleImageKey, shiftWeek, weekLabel, weekRange, weekStartOf } from './citySchedule'

describe('community group links', () => {
  it('finds the same group however the link is written', () => {
    expect(inviteKey('https://chat.whatsapp.com/AbC123xyz')).toBe('chat.whatsapp.com/AbC123xyz')
    expect(inviteKey('http://www.chat.whatsapp.com/invite/AbC123xyz/?mode=r_c')).toBe('chat.whatsapp.com/AbC123xyz')
    // WhatsApp codes are case-sensitive: different codes stay different.
    expect(inviteKey('https://chat.whatsapp.com/abc123xyz')).not.toBe(inviteKey('https://chat.whatsapp.com/AbC123xyz'))
    expect(inviteKey('https://t.me/WeDanceMunich/')).toBe('t.me/wedancemunich')
    expect(inviteKey('https://telegram.me/wedancemunich?x=1')).toBe('t.me/wedancemunich')
    expect(inviteKey('not a link')).toBeNull()
  })

  it('knows the platform from the host', () => {
    expect(platformOf('https://chat.whatsapp.com/x')).toBe('whatsapp')
    expect(platformOf('https://t.me/+abc')).toBe('telegram')
    expect(platformOf('https://www.facebook.com/groups/123')).toBe('facebook')
    expect(platformOf('https://instagram.com/wedancemunich')).toBe('instagram')
    expect(platformOf('https://example.com')).toBe('other')
  })

  it('accepts only invite links of the chosen platform', () => {
    expect(inviteUrlError('whatsapp', 'https://chat.whatsapp.com/AbC')).toBeNull()
    expect(inviteUrlError('whatsapp', 'https://wa.me/4917612345')).toMatch(/chat\.whatsapp\.com/)
    expect(inviteUrlError('whatsapp', 'https://chat.whatsapp.com/')).toMatch(/chat\.whatsapp\.com/)
    expect(inviteUrlError('telegram', 'https://t.me/salsamunich')).toBeNull()
    expect(inviteUrlError('telegram', 'https://chat.whatsapp.com/x')).toMatch(/t\.me/)
    expect(inviteUrlError('other', 'https://discord.gg/x')).toBeNull()
    expect(inviteUrlError('other', 'ftp://x')).toMatch(/https/)
  })

  it('reads the bot chat id from a public Telegram link', () => {
    expect(telegramNameOf('https://t.me/wedancemunich')).toBe('@wedancemunich')
    expect(telegramNameOf('https://t.me/s/wedancemunich')).toBe('@wedancemunich')
    expect(telegramNameOf('https://t.me/+AbCdEf')).toBeNull()
    expect(telegramNameOf('https://chat.whatsapp.com/x')).toBeNull()
  })
})

describe('weekly city schedule', () => {
  const tz = 'Europe/Berlin'
  it('works in weeks starting Monday, in the city’s zone', () => {
    // Sunday 23:30 UTC is already Monday in Munich.
    expect(weekStartOf(new Date('2026-11-15T23:30:00Z'), tz)).toBe('2026-11-16')
    expect(weekStartOf(new Date('2026-11-15T12:00:00Z'), tz)).toBe('2026-11-09')
    expect(isWeekStart('2026-11-16')).toBe(true)
    expect(isWeekStart('2026-11-17')).toBe(false)
    expect(shiftWeek('2026-12-28', 1)).toBe('2027-01-04')
  })

  it('prepares this week, or next week on Sunday', () => {
    expect(defaultWeekStart(new Date('2026-11-18T10:00:00Z'), tz)).toBe('2026-11-16')
    expect(defaultWeekStart(new Date('2026-11-22T10:00:00Z'), tz)).toBe('2026-11-23')
  })

  it('runs from Monday 06:00 to the next Monday 06:00, so Sunday’s late night stays in', () => {
    const { from, to } = weekRange('2026-11-16', tz)
    expect(from.toISOString()).toBe('2026-11-16T05:00:00.000Z')
    expect(to.toISOString()).toBe('2026-11-23T05:00:00.000Z')
  })

  it('labels the week', () => {
    expect(weekLabel('2026-11-16')).toBe('16–22 Nov')
    expect(weekLabel('2026-11-30')).toBe('30 Nov – 6 Dec')
  })

  it('picks nights out, not weekly courses', () => {
    expect(pickedByDefault({ type: 'Party' })).toBe(true)
    expect(pickedByDefault({ type: 'Workshop' })).toBe(true)
    expect(pickedByDefault({ type: null })).toBe(true)
    expect(pickedByDefault({ type: 'Course' })).toBe(false)
  })

  const events = [
    { id: 'b', name: 'Late Kizomba', type: 'Party', startDate: '2026-11-21T00:30:00Z', timezone: tz, venueName: 'Club' },
    { id: 'a', name: 'Salsa Social', type: 'Party', startDate: '2026-11-20T20:00:00Z', timezone: tz, venueName: 'Bar Buena Vista' },
    { id: 'c', name: 'Bachata Workshop', type: 'Workshop', startDate: '2026-11-21T14:00:00Z', timezone: tz, venueName: null },
  ]

  it('groups by night: a 01:30 start belongs to the evening before', () => {
    const days = scheduleDays(events, tz)
    expect(days.map(d => d.date)).toEqual(['2026-11-20', '2026-11-21'])
    expect(days[0]!.items.map(i => [i.time, i.name])).toEqual([['21:00', 'Salsa Social'], ['01:30', 'Late Kizomba']])
    expect(days[1]!.items[0]).toMatchObject({ time: '15:00', name: 'Bachata Workshop', where: null })
  })

  it('writes the post text with the link to the city', () => {
    const text = buildScheduleText({ cityName: 'Munich', weekStart: '2026-11-16', events, link: 'https://2026.wedance.vip/cities/munich', tz })
    expect(text.split('\n')).toEqual([
      '💃 This week in Munich · 16–22 Nov',
      '',
      'FRI 20 NOV',
      '21:00 Salsa Social · Bar Buena Vista',
      '01:30 Late Kizomba · Club',
      '',
      'SAT 21 NOV',
      '15:00 Bachata Workshop',
      '',
      'Classes, more events and who\'s going: https://2026.wedance.vip/cities/munich',
    ])
    expect(buildScheduleText({ cityName: 'Munich', weekStart: '2026-11-16', events: [], link: 'x' })).toContain('Nothing picked')
  })

  it('knows when the picture is out of date', () => {
    const a = scheduleImageKey({ cityName: 'Munich', weekStart: '2026-11-16', events, tz })
    expect(scheduleImageKey({ cityName: 'Munich', weekStart: '2026-11-16', events: [...events].reverse(), tz })).toBe(a)
    expect(scheduleImageKey({ cityName: 'Munich', weekStart: '2026-11-16', events: events.slice(1), tz })).not.toBe(a)
  })
})

describe('city page handle', () => {
  it('is wedance + the city, as its Instagram', () => {
    expect(cityPageHandle('munich')).toBe('wedancemunich')
    expect(cityPageHandle('frankfurt-am-main')).toBe('wedancefrankfurtammain')
    expect(cityPageHandle('Düsseldorf')).toBe('wedancedsseldorf')
  })
})
