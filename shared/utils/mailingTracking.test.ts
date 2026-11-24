import { describe, expect, it } from 'vitest'
import { applyTrackingEvent, mailingStats, mailingStatsLine, type RecipientState } from './mailingTracking'

const fresh = (over: Partial<RecipientState> = {}): RecipientState => ({
  status: 'sent', deliveredAt: null, bouncedAt: null, firstOpenedAt: null, opens: 0, firstClickedAt: null, clicks: 0, ...over,
})
const at = '2026-11-24T10:00:00.000Z'

describe('applyTrackingEvent', () => {
  it('marks a delivery once and keeps the first time', () => {
    const p = applyTrackingEvent(fresh(), { type: 'email.delivered', created_at: at })!
    expect(p.recipient).toEqual({ status: 'delivered', deliveredAt: new Date(at) })
    const again = applyTrackingEvent(fresh({ status: 'delivered', deliveredAt: new Date('2026-01-01') }), { type: 'email.delivered', created_at: at })!
    expect(again.recipient.deliveredAt).toEqual(new Date('2026-01-01'))
    expect(again.recipient.status).toBeUndefined()
  })

  it('never moves a status back (late "delayed" after delivered)', () => {
    expect(applyTrackingEvent(fresh({ status: 'delivered' }), { type: 'email.delivery_delayed' })!.recipient).toEqual({})
  })

  it('a hard bounce blocks the contact, a soft one does not', () => {
    const hard = applyTrackingEvent(fresh(), { type: 'email.bounced', created_at: at, data: { bounce: { type: 'Permanent' } } })!
    expect(hard.recipient).toMatchObject({ status: 'bounced', bounceType: 'hard' })
    expect(hard.contact).toBe('bounced')
    const soft = applyTrackingEvent(fresh(), { type: 'email.bounced', data: { bounce: { type: 'Transient' } } })!
    expect(soft.recipient.bounceType).toBe('soft')
    expect(soft.contact).toBeNull()
  })

  it('a spam complaint unsubscribes the contact', () => {
    const p = applyTrackingEvent(fresh({ status: 'delivered' }), { type: 'email.complained', created_at: at })!
    expect(p.recipient.status).toBe('complained')
    expect(p.contact).toBe('unsubscribe')
  })

  it('counts opens and clicks; a click counts as an open', () => {
    const o = applyTrackingEvent(fresh({ opens: 2, firstOpenedAt: new Date('2026-01-01') }), { type: 'email.opened', created_at: at })!
    expect(o.recipient).toEqual({ opens: 3, firstOpenedAt: new Date('2026-01-01') })
    const c = applyTrackingEvent(fresh(), { type: 'email.clicked', created_at: at })!
    expect(c.recipient).toEqual({ clicks: 1, firstClickedAt: new Date(at), firstOpenedAt: new Date(at), opens: 1 })
  })

  it('ignores events it does not track', () => {
    expect(applyTrackingEvent(fresh(), { type: 'email.sent' })).toBeNull()
    expect(applyTrackingEvent(fresh(), { type: 'contact.created' })).toBeNull()
  })
})

describe('mailingStats', () => {
  it('counts each recipient once per column', () => {
    const d = new Date(at)
    const s = mailingStats([
      { status: 'delivered', deliveredAt: d, firstOpenedAt: d, firstClickedAt: d },
      { status: 'delivered', deliveredAt: d, firstOpenedAt: d, firstClickedAt: null },
      { status: 'bounced', deliveredAt: null, firstOpenedAt: null, firstClickedAt: null },
      { status: 'complained', deliveredAt: null, firstOpenedAt: null, firstClickedAt: null },
      { status: 'sent', deliveredAt: null, firstOpenedAt: null, firstClickedAt: null },
    ])
    expect(s).toEqual({ delivered: 3, opened: 2, clicked: 1, bounced: 1, complained: 1 })
    expect(mailingStatsLine(s)).toBe('3 delivered · 2 opened · 1 clicked · 1 bounced · 1 marked as spam')
    expect(mailingStatsLine({ delivered: 0, opened: 0, clicked: 0, bounced: 0, complained: 0 })).toBe('0 delivered')
  })
})
