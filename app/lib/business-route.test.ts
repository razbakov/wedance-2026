import { describe, it, expect } from 'vitest'
import { profileRoute, switchTarget } from './business-route'

describe('profileRoute', () => {
  it('reads the handle and section of a profile page', () => {
    expect(profileRoute('/business/network/salsea')).toEqual({ handle: 'salsea', section: '' })
    expect(profileRoute('/business/network/salsea/website-history')).toEqual({ handle: 'salsea', section: 'website-history' })
    expect(profileRoute('/business/network/salsea/team/')).toEqual({ handle: 'salsea', section: 'team' })
  })
  it('ignores pages that are not about one profile', () => {
    expect(profileRoute('/business/network')).toBeNull()
    expect(profileRoute('/business/events/12')).toBeNull()
    expect(profileRoute('/business/network/a/b/c')).toBeNull()
  })
})

describe('switchTarget', () => {
  it('opens the same section for the new profile', () => {
    expect(switchTarget('/business/network/salsea/website', 'bfestberlin')).toBe('/business/network/bfestberlin/website')
    expect(switchTarget('/business/network/salsea', 'bfestberlin')).toBe('/business/network/bfestberlin')
  })
  it('goes to Network for "All my profiles"', () => {
    expect(switchTarget('/business/network/salsea/contacts', '')).toBe('/business/network')
  })
  it('stays when nothing changes or the page is not about one profile', () => {
    expect(switchTarget('/business/network/salsea/team', 'salsea')).toBeNull()
    expect(switchTarget('/business/events', 'salsea')).toBeNull()
    expect(switchTarget('/business/network', 'salsea')).toBeNull()
  })
})
