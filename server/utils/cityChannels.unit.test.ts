import { describe, it, expect, vi } from 'vitest'
import { batchLooksBroken, checkInviteLink, readInvitePage } from './groupLinkCheck'
import { checkChat, messageUrl, postPhotoWithText, TelegramError } from './telegram'
import { fitSchedule, scheduleSvg } from './scheduleImage'
import type { ScheduleDay } from '../../shared/utils/citySchedule'

describe('invite link check', () => {
  // The meta tags of real chat.whatsapp.com pages (RAZ-862, Nov 2026), trimmed.
  const waPage = (title: string, typeV2: string | null, extra = '') => [
    `<meta property="og:title" content="${title}" />`,
    '<meta property="og:description" content="WhatsApp Group Invite" />',
    '<meta property="invite_link_type" content="REGULAR" />',
    typeV2 === null ? '' : `<meta property="invite_link_type_v2" content="${typeV2}" />`,
    extra,
  ].join('')

  it('reads WhatsApp invite pages: a name means alive, an empty title AND link type means reset', () => {
    expect(readInvitePage('whatsapp', waPage('Salsa &amp; Bachata Munich', 'REGULAR')))
      .toEqual({ status: 'ok', title: 'Salsa & Bachata Munich' })
    // Working community sub-group and parent, as WhatsApp serves them.
    expect(readInvitePage('whatsapp', waPage('G&#xe9;n&#xe9;ral', 'SUB', '<meta property="parent_group_subject" content="Tarraxo community" />')))
      .toEqual({ status: 'ok', title: 'Général' })
    expect(readInvitePage('whatsapp', waPage('ZOUK FESTIVAL', 'PARENT')).status).toBe('ok')
    // A made-up / reset code: both empty.
    expect(readInvitePage('whatsapp', waPage('', '')).status).toBe('dead')
    // Not the page we know: never guess.
    expect(readInvitePage('whatsapp', '<html>blocked</html>').status).toBe('unknown')
  })

  it('never hides a WhatsApp group on one empty signal', () => {
    // Empty title but the group has a link type: it exists.
    expect(readInvitePage('whatsapp', waPage('', 'REGULAR')).status).toBe('unknown')
    // Empty title and no link-type tag at all: the page changed, not proof.
    expect(readInvitePage('whatsapp', waPage('', null)).status).toBe('unknown')
    expect(readInvitePage('whatsapp', waPage('   ', null)).status).toBe('unknown')
  })

  it('decodes entities in titles without double-decoding', () => {
    expect(readInvitePage('whatsapp', waPage('Rock &#039;n&#039; Roll &amp;lt;3', 'REGULAR')).title).toBe('Rock \'n\' Roll &lt;3')
  })

  it('reads Telegram pages: a title means alive', () => {
    expect(readInvitePage('telegram', '<meta property="og:title" content="Salsa Munich"><div class="tgme_page_title" dir="auto"><span dir="auto">Salsa Munich</span></div>'))
      .toEqual({ status: 'ok', title: 'Salsa Munich' })
    expect(readInvitePage('telegram', '<meta property="og:title" content="Telegram: Contact @nobody">').status).toBe('dead')
  })

  it('only ever fetches WhatsApp and Telegram, rebuilt from the key', async () => {
    const fetchImpl = vi.fn(async () => new Response('<meta property="og:title" content="G"><meta property="og:description" content="x">'))
    expect((await checkInviteLink('https://example.com/evil', fetchImpl as any)).status).toBe('unknown')
    expect(fetchImpl).not.toHaveBeenCalled()
    expect((await checkInviteLink('http://www.chat.whatsapp.com/invite/AbC?x=1', fetchImpl as any)).status).toBe('ok')
    expect(fetchImpl).toHaveBeenCalledWith('https://chat.whatsapp.com/AbC', expect.anything())
  })

  it('a network error is unknown, not dead', async () => {
    const fetchImpl = vi.fn(async () => { throw new Error('offline') })
    expect((await checkInviteLink('https://t.me/salsa', fetchImpl as any)).status).toBe('unknown')
  })

  it('distrusts a batch where almost everything died', () => {
    const dead = { status: 'dead' as const, title: null }
    const ok = { status: 'ok' as const, title: 'x' }
    expect(batchLooksBroken([dead, dead, dead, dead, dead])).toBe(true)
    expect(batchLooksBroken([dead, dead, ok, ok, ok])).toBe(false)
    expect(batchLooksBroken([dead, dead])).toBe(false)
  })
})

describe('telegram bot', () => {
  function bot(responses: Record<string, any>) {
    const calls: { method: string; body: any }[] = []
    const fetchImpl = vi.fn(async (url: string, init: any) => {
      const method = url.split('/').pop()!
      const body = JSON.parse(init.body)
      calls.push({ method, body })
      const r = typeof responses[method] === 'function' ? responses[method](body) : responses[method]
      return new Response(JSON.stringify(r ?? { ok: true, result: {} }))
    })
    return { calls, opts: { token: 't', fetchImpl: fetchImpl as any } }
  }

  it('can post in a channel only as an admin allowed to post', async () => {
    const admin = bot({
      getMe: { ok: true, result: { id: 7, username: 'wedance_bot' } },
      getChat: { ok: true, result: { id: -100, type: 'channel', title: 'WeDance Munich', username: 'wedancemunich' } },
      getChatMember: { ok: true, result: { status: 'administrator', can_post_messages: true } },
    })
    expect(await checkChat('@wedancemunich', admin.opts)).toMatchObject({ canPost: true, bot: 'wedance_bot' })
    const member = bot({
      getMe: { ok: true, result: { id: 7, username: 'wedance_bot' } },
      getChat: { ok: true, result: { id: -100, type: 'channel' } },
      getChatMember: { ok: true, result: { status: 'member' } },
    })
    expect((await checkChat('@x', member.opts)).canPost).toBe(false)
  })

  it('explains Telegram errors in words an admin can act on', async () => {
    const b = bot({ getMe: { ok: false, error_code: 400, description: 'Bad Request: chat not found' } })
    await expect(checkChat('@nope', b.opts)).rejects.toThrow(TelegramError)
    await expect(checkChat('@nope', b.opts)).rejects.toThrow(/can’t find that chat/)
  })

  it('sends a long text after the picture (captions stop at 1024)', async () => {
    const b = bot({
      getChat: { ok: true, result: { id: -100, type: 'channel', username: 'wedancemunich' } },
      sendPhoto: { ok: true, result: { message_id: 41 } },
      sendMessage: { ok: true, result: { message_id: 42 } },
    })
    const r = await postPhotoWithText('@wedancemunich', { photoUrl: 'https://img/x.jpg', text: 'x'.repeat(1500) }, b.opts)
    expect(r.messageId).toBe(41)
    expect(b.calls.map(c => c.method)).toEqual(['getChat', 'sendPhoto', 'sendMessage'])
    expect(b.calls[1]!.body.caption).toBeUndefined()
    expect(messageUrl(r.chat, r.messageId)).toBe('https://t.me/wedancemunich/41')
  })

  it('puts a short text under the picture', async () => {
    const b = bot({ getChat: { ok: true, result: { id: 1, type: 'group' } }, sendPhoto: { ok: true, result: { message_id: 5 } } })
    await postPhotoWithText('-1001', { photoUrl: 'https://img/x.jpg', text: 'Hi' }, b.opts)
    expect(b.calls.map(c => c.method)).toEqual(['getChat', 'sendPhoto'])
    expect(b.calls[1]!.body.caption).toBe('Hi')
  })
})

describe('schedule picture', () => {
  const day = (date: string, n: number): ScheduleDay => ({ date, label: date, items: Array.from({ length: n }, (_, i) => ({ id: `${date}-${i}`, time: '20:00', name: `Party ${i}`, where: 'Club' })) })

  it('shows everything when it fits, at a readable size', () => {
    const r = fitSchedule([day('a', 3), day('b', 4)], 950)
    expect(r.more).toBe(0)
    expect(r.days.flatMap(d => d.items)).toHaveLength(7)
    expect(r.line).toBeGreaterThanOrEqual(40)
  })

  it('keeps the type readable on long weeks and says how many more', () => {
    const r = fitSchedule([day('a', 20), day('b', 20)], 950)
    expect(r.line).toBe(40)
    const shown = r.days.reduce((n, d) => n + d.items.length, 0)
    expect(shown + r.more).toBe(40)
    expect(r.more).toBeGreaterThan(0)
    // What is shown plus the day headings and the "+N more" line fits the area.
    expect(r.days.length * 1.5 + shown + 1).toBeLessThanOrEqual(950 / 40)
  })

  it('escapes names and drops emoji the rasteriser can’t draw', () => {
    const svg = scheduleSvg({ cityName: 'Munich', weekLabel: '16–22 Nov', footer: 'wedance.vip', days: [{ date: 'd', label: 'Fri 20 Nov', items: [{ id: '1', time: '21:00', name: 'Salsa <3 & Bachata 💃', where: null }] }] })
    expect(svg).toContain('Salsa &lt;3 &amp; Bachata')
    expect(svg).not.toContain('💃')
    expect(svg).toContain('FRI 20 NOV')
  })
})
