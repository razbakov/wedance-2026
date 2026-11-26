import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  landingCallout,
  landingPanel,
  landingTabFromQuery,
  landingTabQuery,
  showsLandingTabs,
} from './landingAudience'

describe('landingTabFromQuery', () => {
  it('reads Everyone from a bare homepage', () => {
    expect(landingTabFromQuery(undefined)).toEqual({ tab: 'everyone', replace: false, via: 'load' })
    expect(landingTabFromQuery('')).toEqual({ tab: 'everyone', replace: false, via: 'load' })
    expect(landingTabFromQuery([])).toEqual({ tab: 'everyone', replace: false, via: 'load' })
  })

  it('reads artists, organizers and venues from ?tab=', () => {
    expect(landingTabFromQuery('artists')).toEqual({ tab: 'artists', replace: false, via: 'link' })
    expect(landingTabFromQuery('organizers')).toEqual({ tab: 'organizers', replace: false, via: 'link' })
    expect(landingTabFromQuery('venues')).toEqual({ tab: 'venues', replace: false, via: 'link' })
    expect(landingTabFromQuery(['artists'])).toEqual({ tab: 'artists', replace: false, via: 'link' })
  })

  it('drops ?tab=everyone and any unknown value back to Everyone', () => {
    expect(landingTabFromQuery('everyone')).toEqual({ tab: 'everyone', replace: true, via: 'link' })
    expect(landingTabFromQuery('nope')).toEqual({ tab: 'everyone', replace: true, via: 'link' })
    expect(landingTabFromQuery(['nope', 'artists'])).toEqual({ tab: 'everyone', replace: true, via: 'link' })
  })
})

describe('landingTabQuery', () => {
  it('drops the tab param on Everyone and keeps every other key', () => {
    expect(landingTabQuery({ utm: 'ig', tab: 'artists' }, 'everyone')).toEqual({ utm: 'ig' })
  })

  it('sets ?tab= for the other audiences and keeps every other key', () => {
    expect(landingTabQuery({ utm: 'ig' }, 'venues')).toEqual({ utm: 'ig', tab: 'venues' })
    expect(landingTabQuery({ tab: 'artists' }, 'organizers')).toEqual({ tab: 'organizers' })
  })
})

describe('showsLandingTabs', () => {
  it('shows the audience tabs on the homepage only', () => {
    expect(showsLandingTabs('home')).toBe(true)
    expect(showsLandingTabs('my_plan_landing')).toBe(false)
  })
})

describe('approved landing copy (RAZ-1095)', () => {
  it('sends each callout to the approved page', () => {
    expect(landingCallout('everyone')).toMatchObject({
      cta: 'start_event',
      label: 'Start your own event',
      to: '/business/events/new',
      headline: 'Make the night yours.',
      line: 'Private party, wedding or company night.',
    })
    expect(landingCallout('artists')).toMatchObject({
      cta: 'book_date',
      label: 'Book your next date',
      to: '/gigs',
      hand: 'Add the next date to your year.',
    })
    expect(landingCallout('organizers')).toMatchObject({
      cta: 'post_event',
      label: 'Post your event in minutes',
      to: '/business/events/new',
      hand: 'A social, a course, a festival — post it tonight.',
    })
    expect(landingCallout('venues')).toMatchObject({
      cta: 'list_space',
      label: 'List your space',
      to: '/business/new?type=venue',
      hand: "Studios, clubs and halls — they'll find you.",
    })
  })

  it('uses the approved headlines and card lines', () => {
    expect(landingPanel('artists')).toMatchObject({
      eyebrow: 'For artists',
      headline: 'Your year,',
      accent: 'told in one place.',
      line: 'Teachers, DJs and performers: a website, flyers and a tour calendar for the whole year, so organizers and dancers see where you are next.',
      learnMore: { label: 'How artist pages work', to: '/artists' },
    })
    expect(landingPanel('artists').points.map(p => p.detail)).toEqual([
      'A page with your bio, videos and what you teach.',
      'One flyer per date, painted in your look.',
      'Your programme for the year, and who is hosting.',
    ])
    expect(landingPanel('organizers')).toMatchObject({
      eyebrow: 'For organizers',
      headline: 'Every post for your event,',
      accent: 'made for you.',
      line: 'Put your event on WeDance and get the flyer, a post per artist and a countdown, painted in your look.',
      learnMore: { label: 'More for organizers', to: '/for-organizers' },
    })
    expect(landingPanel('venues')).toMatchObject({
      eyebrow: 'For venues',
      headline: 'Fill your space',
      accent: 'with dancers.',
      line: 'List your floor and get booking requests from organizers who need a space for classes, socials, festivals and private events.',
      learnMore: { label: 'More for venues', to: '/for-venues' },
    })
    expect(landingPanel('venues').points.map(p => p.detail)).toEqual([
      'Organizers search by city, size and the music they play.',
      'Dates, headcount and terms in each request.',
      'You set the price and the rules. You choose who books.',
    ])
  })
})

describe('story pictures use type and shadow tokens', () => {
  const files = [
    'app/components/MyPlanLanding.vue',
    'app/components/LandingAudiencePanel.vue',
    'app/components/LandingCallout.vue',
    'app/components/LandingDancerPitch.vue',
  ]

  it('has no arbitrary text-[Npx] size or shadow-xl', () => {
    for (const file of files) {
      const src = readFileSync(file, 'utf8')
      expect(src, file).not.toMatch(/text-\[\d/)
      expect(src, file).not.toMatch(/\bshadow-xl\b/)
    }
  })
})
