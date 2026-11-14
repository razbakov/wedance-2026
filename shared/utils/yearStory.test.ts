import { describe, it, expect } from 'vitest'
import {
  festivalDayRange, festivalDays, festivalMonth, festivalPlace, pickYearLine, yearFamily, yearOfPlan,
  yearShareUrl, yearStoryFestivals, yearStoryLinkText, yearStoryStats, YEAR_LINES,
} from './yearStory'
import { STORY_LINE_MAX } from './storyLines'

const f = (name: string, startDate: string, endDate: string, location = '', country = '', styles: string[] = []) =>
  ({ name, startDate, endDate, location, country, styles })

const plan = [
  f('Berlin Salsa Congress', '2026-06-04', '2026-06-07', 'Berlin', 'Germany', ['Salsa']),
  f('Cuba Mía Weekend', '2026-03-13', '2026-03-15', 'Munich', 'Germany', ['Cuban']),
  f('Timba Fest Prague', '2026-10-30', '2026-11-01', 'Prague', 'Czechia', ['Timba']),
]

describe('yearStory', () => {
  it('orders festivals by date and drops undated ones', () => {
    const out = yearStoryFestivals([...plan, f('No date', '', '')])
    expect(out.map(x => x.name)).toEqual(['Cuba Mía Weekend', 'Berlin Salsa Congress', 'Timba Fest Prague'])
  })

  it('counts days with both ends, like the stats card', () => {
    expect(festivalDays(plan[0]!)).toBe(4)
    expect(festivalDays(f('One day', '2026-05-01', '2026-05-01'))).toBe(1)
    expect(festivalDays(f('No end', '2026-05-01', ''))).toBe(1)
    expect(festivalDays(f('Backwards', '2026-05-03', '2026-05-01'))).toBe(1)
  })

  it('counts festivals, dance days, cities and countries', () => {
    expect(yearStoryStats(plan)).toEqual({ festivals: 3, danceDays: 4 + 3 + 3, cities: 3, countries: 2 })
    expect(yearStoryStats([])).toEqual({ festivals: 0, danceDays: 0, cities: 0, countries: 0 })
  })

  it('takes the year most festivals are in', () => {
    expect(yearOfPlan(plan, 2000)).toBe(2026)
    expect(yearOfPlan([f('a', '2027-01-10', '2027-01-12'), ...plan], 2000)).toBe(2026)
    expect(yearOfPlan([], 2026)).toBe(2026)
  })

  it('colours the year by its main dance family', () => {
    expect(yearFamily(plan)).toBe('cuban')
    expect(yearFamily([f('Friday night', '2026-01-01', '2026-01-01')])).toBeNull()
  })

  it('writes month, days and place without slipping a day', () => {
    expect(festivalMonth(plan[1]!)).toBe('MAR')
    expect(festivalDayRange(plan[1]!)).toBe('13–15')
    expect(festivalDayRange(plan[2]!)).toBe('30 – 1 NOV')
    expect(festivalDayRange(f('One', '2026-05-01', '2026-05-01'))).toBe('1')
    expect(festivalPlace(plan[0]!)).toBe('Berlin · Germany')
    expect(festivalPlace(f('x', '2026-01-01', '', '', 'Spain'))).toBe('Spain')
  })

  it('shuffles to a different line that fits on the story', () => {
    for (const l of YEAR_LINES) expect(l.length).toBeLessThanOrEqual(STORY_LINE_MAX)
    expect(pickYearLine(YEAR_LINES[0], () => 0)).not.toBe(YEAR_LINES[0])
  })

  it('links to the year page by handle, else by dancer id', () => {
    expect(yearShareUrl('https://2026.wedance.vip', 'alex', 'id-1')).toBe('https://2026.wedance.vip/my-year?user=alex&ref=alex')
    expect(yearShareUrl('https://2026.wedance.vip', null, 'id-1')).toBe('https://2026.wedance.vip/my-year?user=id-1&ref=id-1')
    expect(yearShareUrl('', null, null)).toBe('/my-year?user=shared')
  })

  it('writes the link short on the story', () => {
    expect(yearStoryLinkText('https://2026.wedance.vip/my-year?user=alex&ref=alex')).toBe('2026.wedance.vip/my-year?user=alex')
  })
})
