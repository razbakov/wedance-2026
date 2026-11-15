import { describe, expect, it } from 'vitest'
import { ADMIN_NAV, adminNavActive } from './admin-nav'

const item = (to: string) => ADMIN_NAV.find(i => i.to === to)!

describe('admin nav', () => {
  it('puts three sections in the phone tab bar', () => {
    expect(ADMIN_NAV.filter(i => i.tab).map(i => i.to)).toEqual(['/admin', '/admin/claims', '/admin/users'])
  })

  it('matches Dashboard only on /admin itself', () => {
    expect(adminNavActive(item('/admin'), '/admin')).toBe(true)
    expect(adminNavActive(item('/admin'), '/admin/users')).toBe(false)
  })

  it('matches a section and its sub-pages, not a sibling sharing a prefix', () => {
    expect(adminNavActive(item('/admin/festivals'), '/admin/festivals/x-fest')).toBe(true)
    expect(adminNavActive(item('/admin/users'), '/admin/users-old')).toBe(false)
  })
})
