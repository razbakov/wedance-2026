import { describe, expect, it } from 'vitest'
import { fallbackIssue, ReportFallbackInput } from './reportFallback'

describe('fallbackIssue', () => {
  it('titles by type and first line, and carries the triage context', () => {
    const r = ReportFallbackInput.parse({
      type: 'bug',
      description: 'Save does nothing\non the event page',
      email: 'a@b.co',
      username: 'alex',
      sentryError: 'Failed to fetch',
      context: { url: 'https://2026.wedance.vip/x', userAgent: 'UA', viewport: '1280×800', consoleErrors: ['TypeError'] },
    })
    const { title, description } = fallbackIssue(r)
    expect(title).toBe('🐞 Save does nothing')
    expect(description).toContain('on the event page')
    expect(description).toContain('**Email:** a@b.co')
    expect(description).toContain('@alex')
    expect(description).toContain('**Page:** https://2026.wedance.vip/x')
    expect(description).toContain('TypeError')
    expect(description).toContain('(Failed to fetch)')
  })

  it('shortens long titles and marks ideas', () => {
    const r = ReportFallbackInput.parse({ type: 'idea', description: 'x'.repeat(200) })
    const { title } = fallbackIssue(r)
    expect(title.startsWith('💡 ')).toBe(true)
    expect(title.length).toBeLessThanOrEqual(83)
  })

  it('rejects an empty description and accepts an empty email', () => {
    expect(ReportFallbackInput.safeParse({ type: 'bug', description: '  ' }).success).toBe(false)
    expect(ReportFallbackInput.safeParse({ type: 'bug', description: 'x', email: '' }).success).toBe(true)
  })
})
