import { describe, expect, it } from 'vitest'
import { buildBugIssue, redactBugReport, SUPPORT_PROJECT_ID } from './bugReport'
import { TOOLS, visibleTools } from './tools'
import { callTool } from './server'
import { appRouter } from '../trpc'

const raw = {
  message: 'update_event rejected a co-organizer I passed as a handle.',
  tool: 'update_event',
  error: 'co_organizers.0: Invalid input; also wrote to ada@example.com and +49 151 23456789',
  arguments: {
    event_id: '11111111-1111-4111-8111-111111111111',
    co_organizers: ['@ada'],
    email: 'ada@example.com',
    password: 'hunter2',
    confirm_token: 'secret-token',
    note: 'ping ada@example.com and Bearer aaa.bbb.cccccccccccccccc',
    phone: '+49 151 23456789',
  },
  contactEmail: 'alex@example.com',
}

describe('redactBugReport', () => {
  it('drops secrets and contact details from the captured arguments and the error', () => {
    const r = redactBugReport(raw)
    const args = r.arguments as Record<string, unknown>
    expect(args.event_id).toBe(raw.arguments.event_id)
    expect(args.co_organizers).toEqual(['@ada'])
    expect(args.email).toBe('[redacted]')
    expect(args.password).toBe('[redacted]')
    expect(args.confirm_token).toBe('[redacted]')
    expect(args.phone).toBe('[redacted]')
    expect(JSON.stringify(args.note)).not.toMatch(/ada@example\.com|Bearer/)
    expect(r.error).not.toMatch(/ada@example\.com|\+49/)
    expect(r.error).toContain('co_organizers.0: Invalid input')
    expect(r.contactEmail).toBe('alex@example.com')
    expect(r.message).toContain('co-organizer')
  })

  it('leaves the reply address out when the reporter did not give one', () => {
    expect(redactBugReport({ ...raw, contactEmail: null }).contactEmail).toBeNull()
  })

  it('keeps the reply address on a second report (the email scan does not get stuck)', () => {
    redactBugReport(raw)
    expect(redactBugReport(raw).contactEmail).toBe('alex@example.com')
  })
})

describe('buildBugIssue', () => {
  it('files a short bug title and the tool, error and redacted arguments', () => {
    const issue = buildBugIssue({ ...redactBugReport(raw), reporter: 'alex', clientApp: 'cursor' })
    expect(issue.title.startsWith('🐞 ')).toBe(true)
    expect(issue.title.length).toBeLessThan(120)
    expect(issue.description).toContain('update_event')
    expect(issue.description).toContain('co_organizers.0: Invalid input')
    expect(issue.description).toContain('@alex')
    expect(issue.description).toContain('alex@example.com')
    expect(issue.description).toContain('cursor')
    expect(issue.description).not.toMatch(/hunter2|secret-token|ada@example\.com/)
    expect(issue.projectId).toBe('ff24241d-28fe-4f2e-92c2-b220340dbe18')
  })

  it('does not invent a reply address', () => {
    const issue = buildBugIssue({ ...redactBugReport({ ...raw, contactEmail: null }), reporter: null, clientApp: null })
    expect(issue.description).not.toMatch(/example\.com/)
    expect(issue.description).toContain('report_bug')
  })
})

describe('report_bug tool', () => {
  const names = (c: Parameters<typeof visibleTools>[0]) => visibleTools(c).map(t => t.name)
  const anon = { scopes: [], grantedProfileIds: [], isAdmin: false }

  it('is offered to any signed-in connection and hidden from anonymous reads', () => {
    expect(names(anon)).not.toContain('report_bug')
    expect(visibleTools(anon).every(t => t.annotations.readOnlyHint)).toBe(true)
    expect(names({ scopes: ['me:read'], grantedProfileIds: [], isAdmin: false })).toContain('report_bug')
    expect(names({ scopes: ['business:write'], grantedProfileIds: ['p1'], isAdmin: false })).toContain('report_bug')
    expect(names({ ...anon, signedIn: true })).toContain('report_bug')
    const def = TOOLS.find(t => t.name === 'report_bug')!
    expect(def.confirm).toBe(true)
    expect(def.confirmWithoutPublish).toBe(true)
  })

  const report = {
    what_happened: 'update_event rejected a co-organizer I passed as a handle.',
    tool: 'update_event',
    error: 'co_organizers.0: Invalid input',
    arguments: { event_id: '11111111-1111-4111-8111-111111111111', email: 'ada@example.com', password: 'hunter2' },
    contact_email: 'alex@example.com',
  }

  function ctx(scopes: string[]) {
    const filed: unknown[] = []
    const db = {
      insert: () => ({ values: () => ({ onConflictDoNothing: () => ({ returning: async () => [{ id: 'audit-1' }] }) }) }),
      update: () => ({ set: () => ({ where: async () => [] }) }),
    }
    const t = {
      caller: { feedback: { reportBug: async (input: unknown) => { filed.push(input); return { ok: true, reference: 'RAZ-1' } } } },
      ctx: { db, dancerId: 'd1', isAdmin: false, scopes, grantedProfileIds: [], oauthGrantId: 'g1', origin: 'https://2026.wedance.vip' },
      origin: 'https://2026.wedance.vip',
      client: { app: 'cursor' },
    } as any
    return { t, filed }
  }

  function body(r: { content: { text: string }[] }) {
    const text = r.content[0]!.text
    return JSON.parse(text.slice(text.indexOf('\n<wedance-data>\n') + 16, text.lastIndexOf('\n</wedance-data>')))
  }

  it('shows a redacted preview and files only after the user agrees, without business:publish', async () => {
    const { t, filed } = ctx(['me:read'])
    const preview = await callTool(TOOLS.find(t => t.name === 'report_bug')!, report, t)
    expect(preview.isError).toBeFalsy()
    const shown = body(preview as any)
    expect(shown.status).toBe('needs_confirmation')
    expect(JSON.stringify(shown.preview)).not.toMatch(/hunter2|ada@example\.com/)
    expect(JSON.stringify(shown.preview)).toContain('alex@example.com')
    expect(filed).toEqual([])

    const done = await callTool(TOOLS.find(t => t.name === 'report_bug')!, { ...report, confirm_token: shown.confirm_token }, t)
    expect(done.isError).toBeFalsy()
    expect(filed).toHaveLength(1)
    expect(JSON.stringify(filed[0])).not.toMatch(/hunter2|ada@example\.com/)
    expect(JSON.stringify(filed[0])).toContain('update_event')
    expect(body(done as any).reference).toBe('RAZ-1')
  })

  it('tells an anonymous caller to use the site instead', async () => {
    const { t } = ctx([])
    t.ctx.oauthGrantId = null
    t.ctx.dancerId = null
    const r = await callTool(TOOLS.find(t => t.name === 'report_bug')!, report, t)
    expect(r.isError).toBe(true)
    expect(r.content[0]!.text).toMatch(/hello@wedance\.vip/)
  })
})

describe('feedback.reportBug', () => {
  const input = {
    message: 'update_event rejected a co-organizer I passed as a handle.',
    tool: 'update_event',
    error: 'co_organizers.0: Invalid input',
    arguments: { password: 'hunter2', email: 'ada@example.com', event_id: '11111111-1111-4111-8111-111111111111' },
    contactEmail: 'alex@example.com',
    clientApp: 'cursor',
  }
  const caller = () => appRouter.createCaller({
    db: { select: () => ({ from: () => ({ where: async () => [{ username: 'alex' }] }) }) },
    dancerId: 'd1', isAdmin: false, scopes: ['me:read'], grantedProfileIds: [],
  } as any)

  it('does not call Linear when it is not configured', async () => {
    const prev = process.env.LINEAR_API_KEY
    delete process.env.LINEAR_API_KEY
    const original = globalThis.fetch
    const calls: string[] = []
    globalThis.fetch = (async (url: unknown) => { calls.push(String(url)); throw new Error('network') }) as typeof fetch
    try {
      await expect(caller().feedback.reportBug(input)).rejects.toThrow(/hello@wedance\.vip/)
      expect(calls).toEqual([])
    } finally {
      globalThis.fetch = original
      if (prev === undefined) delete process.env.LINEAR_API_KEY
      else process.env.LINEAR_API_KEY = prev
    }
  })

  it('files a redacted issue into the WeDance Support project', async () => {
    const prev = process.env.LINEAR_API_KEY
    process.env.LINEAR_API_KEY = 'test-key'
    const original = globalThis.fetch
    const sent: { query: string; variables: any }[] = []
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body))
      sent.push(body)
      const q = body.query as string
      if (q.includes('issueCreate')) {
        return new Response(JSON.stringify({ data: { issueCreate: { success: true, issue: { identifier: 'RAZ-9' } } } }))
      }
      if (q.includes('labels')) return new Response(JSON.stringify({ data: { team: { labels: { nodes: [{ id: 'lab' }] } } } }))
      return new Response(JSON.stringify({ data: { team: { states: { nodes: [{ id: 'st', type: 'triage' }] } } } }))
    }) as typeof fetch
    try {
      const result = await caller().feedback.reportBug(input)
      expect(result).toEqual({ ok: true, reference: 'RAZ-9' })
      const created = sent.find(s => s.query.includes('issueCreate'))!
      expect(created.variables.i.projectId).toBe(SUPPORT_PROJECT_ID)
      expect(created.variables.i.title.startsWith('🐞 ')).toBe(true)
      expect(created.variables.i.description).toContain('@alex')
      expect(created.variables.i.description).toContain('alex@example.com')
      expect(created.variables.i.description).not.toMatch(/hunter2|ada@example\.com/)
    } finally {
      globalThis.fetch = original
      if (prev === undefined) delete process.env.LINEAR_API_KEY
      else process.env.LINEAR_API_KEY = prev
    }
  })
})
