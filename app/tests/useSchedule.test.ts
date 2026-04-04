import { describe, it, expect } from 'vitest'
import { reactive, computed } from 'vue'
import { mockFestival } from '~/data/mock-festival'
import type { Festival, Workshop, DanceStyle, FestivalDay } from '~/types/schedule'

/**
 * Inline the composable logic for unit testing without full Nuxt context.
 * This mirrors the useSchedule composable.
 */
function createSchedule(festival: Festival) {
  const filters = reactive<{ day: string | null; danceStyle: DanceStyle | null }>({
    day: null,
    danceStyle: null,
  })

  const availableStyles = computed<DanceStyle[]>(() => {
    const styles = new Set(festival.workshops.map((w) => w.danceStyle))
    return [...styles].sort() as DanceStyle[]
  })

  const filteredWorkshops = computed<Workshop[]>(() => {
    let result = [...festival.workshops]
    if (filters.day) {
      result = result.filter((w) => w.startTime.startsWith(filters.day!))
    }
    if (filters.danceStyle) {
      result = result.filter((w) => w.danceStyle === filters.danceStyle)
    }
    result.sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )
    return result
  })

  const workshopsByDay = computed<{ day: FestivalDay; workshops: Workshop[] }[]>(() => {
    const days = filters.day
      ? festival.days.filter((d) => d.date === filters.day)
      : festival.days
    return days.map((day) => ({
      day,
      workshops: filteredWorkshops.value.filter((w) => w.startTime.startsWith(day.date)),
    }))
  })

  const isEmpty = computed(() => filteredWorkshops.value.length === 0)

  return { filters, availableStyles, filteredWorkshops, workshopsByDay, isEmpty }
}

describe('useSchedule', () => {
  it('returns all workshops when no filters are active', () => {
    const { filteredWorkshops } = createSchedule(mockFestival)
    expect(filteredWorkshops.value.length).toBe(mockFestival.workshops.length)
  })

  it('sorts workshops chronologically', () => {
    const { filteredWorkshops } = createSchedule(mockFestival)
    const times = filteredWorkshops.value.map((w) => new Date(w.startTime).getTime())
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeGreaterThanOrEqual(times[i - 1])
    }
  })

  it('filters by day', () => {
    const { filters, filteredWorkshops } = createSchedule(mockFestival)
    filters.day = '2026-06-12'
    const allFriday = filteredWorkshops.value.every((w) =>
      w.startTime.startsWith('2026-06-12')
    )
    expect(allFriday).toBe(true)
    expect(filteredWorkshops.value.length).toBeGreaterThan(0)
    expect(filteredWorkshops.value.length).toBeLessThan(mockFestival.workshops.length)
  })

  it('filters by dance style', () => {
    const { filters, filteredWorkshops } = createSchedule(mockFestival)
    filters.danceStyle = 'Salsa'
    const allSalsa = filteredWorkshops.value.every((w) => w.danceStyle === 'Salsa')
    expect(allSalsa).toBe(true)
    expect(filteredWorkshops.value.length).toBeGreaterThan(0)
  })

  it('combines day and style filters', () => {
    const { filters, filteredWorkshops } = createSchedule(mockFestival)
    filters.day = '2026-06-13'
    filters.danceStyle = 'Salsa'
    expect(filteredWorkshops.value.length).toBeGreaterThan(0)
    for (const w of filteredWorkshops.value) {
      expect(w.startTime.startsWith('2026-06-13')).toBe(true)
      expect(w.danceStyle).toBe('Salsa')
    }
  })

  it('returns empty when filters match nothing', () => {
    const { filters, isEmpty } = createSchedule(mockFestival)
    filters.day = '2026-06-12'
    filters.danceStyle = 'Reggaeton' // no reggaeton on Friday
    expect(isEmpty.value).toBe(true)
  })

  it('groups workshops by day', () => {
    const { workshopsByDay } = createSchedule(mockFestival)
    expect(workshopsByDay.value.length).toBe(3)
    expect(workshopsByDay.value[0].day.label).toBe('Friday')
    expect(workshopsByDay.value[1].day.label).toBe('Saturday')
    expect(workshopsByDay.value[2].day.label).toBe('Sunday')
  })

  it('extracts unique dance styles sorted alphabetically', () => {
    const { availableStyles } = createSchedule(mockFestival)
    const styles = availableStyles.value
    expect(styles.length).toBeGreaterThan(0)
    for (let i = 1; i < styles.length; i++) {
      expect(styles[i].localeCompare(styles[i - 1])).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('mock data', () => {
  it('has at least 15 workshops', () => {
    expect(mockFestival.workshops.length).toBeGreaterThanOrEqual(15)
  })

  it('covers 3 days', () => {
    expect(mockFestival.days.length).toBe(3)
  })

  it('has concurrent workshops (same time, different rooms)', () => {
    const byTime = new Map<string, Workshop[]>()
    for (const w of mockFestival.workshops) {
      const key = w.startTime
      if (!byTime.has(key)) byTime.set(key, [])
      byTime.get(key)!.push(w)
    }
    const hasConcurrent = [...byTime.values()].some((group) => {
      const rooms = new Set(group.map((w) => w.room))
      return rooms.size > 1
    })
    expect(hasConcurrent).toBe(true)
  })

  it('has all required fields on every workshop', () => {
    for (const w of mockFestival.workshops) {
      expect(w.id).toBeTruthy()
      expect(w.name).toBeTruthy()
      expect(w.artist).toBeTruthy()
      expect(w.startTime).toBeTruthy()
      expect(w.endTime).toBeTruthy()
      expect(w.room).toBeTruthy()
      expect(w.danceStyle).toBeTruthy()
      expect(w.level).toBeTruthy()
    }
  })
})
