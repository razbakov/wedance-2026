import { describe, expect, it } from 'vitest'
import { eventBackTarget } from './eventBack'

const munich = { slug: 'munich', name: 'Munich' }
const event = '/events/salsa-night-ab12'

describe('eventBackTarget (RAZ-1020)', () => {
  it('returns to the in-app page the dancer came from', () => {
    expect(eventBackTarget({ historyBack: '/my-plan', position: 4, eventPath: event, city: munich }).back)
      .toEqual({ href: '/my-plan', label: 'My plan', delta: 1 })
    expect(eventBackTarget({ historyBack: '/my-plan?week=1#socials', position: 4, eventPath: event, city: munich }).back)
      .toEqual({ href: '/my-plan?week=1#socials', label: 'My plan', delta: 1 })
    expect(eventBackTarget({ historyBack: '/cities/munich', position: 2, eventPath: event, city: munich }).back)
      .toEqual({ href: '/cities/munich', label: 'Munich', delta: 1 })
    expect(eventBackTarget({ historyBack: '/cities/munich/venues?style=salsa', position: 2, eventPath: event, city: munich }).back)
      .toEqual({ href: '/cities/munich/venues?style=salsa', label: 'Munich', delta: 1 })
    expect(eventBackTarget({ historyBack: '/@salsea', position: 2, eventPath: event }).back)
      .toEqual({ href: '/@salsea', label: '@salsea', delta: 1 })
    expect(eventBackTarget({ historyBack: '/', position: 2, eventPath: event }).back.label).toBe('Home')
  })

  it('names a city it does not know from the slug', () => {
    expect(eventBackTarget({ historyBack: '/cities/berlin', position: 2, eventPath: event, city: munich }).back.label).toBe('Berlin')
  })

  it('keeps a query and hash on the way back, and still calls another event Back', () => {
    const other = eventBackTarget({ historyBack: '/events/other-night', position: 3, eventPath: event }).back
    expect(other).toEqual({ href: '/events/other-night', label: 'Back', delta: 1 })
  })

  it('does not treat a tab change as somewhere to go back to', () => {
    const landed = eventBackTarget({
      historyBack: `${event}?tab=schedule`,
      position: 6,
      eventPath: event,
      city: munich,
    })
    expect(landed.back).toEqual({ href: '/cities/munich', label: 'Munich', delta: 0 })
    expect(landed.memory).toBeNull()

    const fromPlan = eventBackTarget(
      { historyBack: `${event}?tab=lineup`, position: 6, eventPath: event, city: munich },
      { path: event, origin: '/my-plan', position: 4 },
    )
    expect(fromPlan.back).toEqual({ href: '/my-plan', label: 'My plan', delta: 3 })
    expect(fromPlan.memory).toEqual({ path: event, origin: '/my-plan', position: 4 })
  })

  it('remembers where this visit started, and a later arrival replaces that', () => {
    const first = eventBackTarget({ historyBack: '/my-plan', position: 4, eventPath: event, city: munich })
    expect(first.memory).toEqual({ path: event, origin: '/my-plan', position: 4 })

    const again = eventBackTarget(
      { historyBack: '/cities/munich', position: 8, eventPath: event, city: munich },
      first.memory,
    )
    expect(again.back.href).toBe('/cities/munich')
    expect(again.memory).toEqual({ path: event, origin: '/cities/munich', position: 8 })
  })

  it('ignores a memory stamped for a different event', () => {
    const result = eventBackTarget(
      { historyBack: `${event}?tab=reviews`, position: 5, eventPath: event, city: munich },
      { path: '/events/other', origin: '/my-plan', position: 2 },
    )
    expect(result.back.href).toBe('/cities/munich')
    expect(result.memory).toBeNull()
  })

  it('falls back to the event city when the page was opened directly', () => {
    const result = eventBackTarget(
      { historyBack: null, eventPath: event, city: munich },
      { path: event, origin: '/my-plan', position: 4 },
    )
    expect(result.back).toEqual({ href: '/cities/munich', label: 'Munich', delta: 0 })
    expect(result.memory).toBeNull()
  })

  it('falls back to the city list when the event has no city', () => {
    expect(eventBackTarget({ historyBack: null, eventPath: event }).back)
      .toEqual({ href: '/cities', label: 'Cities', delta: 0 })
    expect(eventBackTarget({ historyBack: null, eventPath: event, city: { slug: '../x', name: 'X' } }).back.href)
      .toBe('/cities')
    expect(eventBackTarget({ historyBack: null, eventPath: event, city: { slug: 'munich', name: 'munich' } }).back)
      .toEqual({ href: '/cities/munich', label: 'Munich', delta: 0 })
  })

  it('refuses a back target that is not an in-app path', () => {
    for (const historyBack of ['//evil.test', 'https://evil.test/my-plan', '/\\evil', 'my-plan', '']) {
      expect(eventBackTarget({ historyBack, eventPath: event, city: munich }).back.href).toBe('/cities/munich')
    }
  })

  it('does not walk an unbelievable number of history steps', () => {
    const result = eventBackTarget(
      { historyBack: `${event}?tab=schedule`, position: 40, eventPath: event, city: munich },
      { path: event, origin: '/my-plan#socials', position: 4 },
    )
    expect(result.back).toEqual({ href: '/my-plan#socials', label: 'My plan', delta: 0 })
  })

  it('still returns to where they came from while the current url has a tab', () => {
    expect(eventBackTarget({
      historyBack: '/my-plan',
      position: 4,
      eventPath: `${event}?tab=schedule`,
      city: munich,
    }).back).toEqual({ href: '/my-plan', label: 'My plan', delta: 1 })
  })
})
