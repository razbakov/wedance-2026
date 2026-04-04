import { describe, it, expect } from 'vitest'
import { reactive, computed } from 'vue'
import { mockFestival } from '~/data/mock-festival'
import type {
  FestivalSchedule,
  WorkshopWithId,
  DanceStyle,
  FestivalDay,
  Room,
} from '~/types/schedule'

/**
 * Inline the composable logic for unit testing without full Nuxt context.
 * This mirrors the useSchedule composable.
 */
function buildRoomMap(rooms: Room[]): Map<string, string> {
  return new Map(rooms.map((r) => [r.id, r.name]))
}

function deriveDays(startDate: string, endDate: string): FestivalDay[] {
  const days: FestivalDay[] = []
  const start = new Date(startDate + 'T12:00:00Z')
  const end = new Date(endDate + 'T12:00:00Z')
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' })
    days.push({ date: iso, label })
  }
  return days
}

function workshopId(w: { day: string; startTime: string; roomId: string }): string {
  return `${w.day}-${w.startTime}-${w.roomId}`
}

function enrichWorkshops(festival: FestivalSchedule): WorkshopWithId[] {
  const roomMap = buildRoomMap(festival.rooms)
  return festival.workshops.map((w) => ({
    ...w,
    id: workshopId(w),
    roomName: roomMap.get(w.roomId) ?? w.roomId,
  }))
}

function createSchedule(festival: FestivalSchedule) {
  const filters = reactive<{ day: string | null; danceStyle: DanceStyle | null }>({
    day: null,
    danceStyle: null,
  })

  const days = computed<FestivalDay[]>(() =>
    deriveDays(festival.festival.startDate, festival.festival.endDate)
  )

  const workshops = computed<WorkshopWithId[]>(() => enrichWorkshops(festival))

  const availableStyles = computed<DanceStyle[]>(() => {
    const styles = new Set(
      festival.workshops
        .map((w) => w.danceStyle)
        .filter((s): s is DanceStyle => s !== undefined)
    )
    return [...styles].sort() as DanceStyle[]
  })

  const filteredWorkshops = computed<WorkshopWithId[]>(() => {
    let result = [...workshops.value]
    if (filters.day) {
      result = result.filter((w) => w.day === filters.day)
    }
    if (filters.danceStyle) {
      result = result.filter((w) => w.danceStyle === filters.danceStyle)
    }
    result.sort((a, b) => {
      const dayCompare = a.day.localeCompare(b.day)
      if (dayCompare !== 0) return dayCompare
      return a.startTime.localeCompare(b.startTime)
    })
    return result
  })

  const workshopsByDay = computed<{ day: FestivalDay; workshops: WorkshopWithId[] }[]>(() => {
    const activeDays = filters.day
      ? days.value.filter((d) => d.date === filters.day)
      : days.value
    return activeDays.map((day) => ({
      day,
      workshops: filteredWorkshops.value.filter((w) => w.day === day.date),
    }))
  })

  const isEmpty = computed(() => filteredWorkshops.value.length === 0)

  return { filters, days, availableStyles, filteredWorkshops, workshopsByDay, isEmpty }
}

describe('useSchedule', () => {
  it('returns all workshops when no filters are active', () => {
    const { filteredWorkshops } = createSchedule(mockFestival)
    expect(filteredWorkshops.value.length).toBe(mockFestival.workshops.length)
  })

  it('sorts workshops chronologically', () => {
    const { filteredWorkshops } = createSchedule(mockFestival)
    const keys = filteredWorkshops.value.map((w) => `${w.day}T${w.startTime}`)
    for (let i = 1; i < keys.length; i++) {
      expect(keys[i].localeCompare(keys[i - 1])).toBeGreaterThanOrEqual(0)
    }
  })

  it('filters by day', () => {
    const { filters, filteredWorkshops } = createSchedule(mockFestival)
    filters.day = '2026-06-12'
    const allFriday = filteredWorkshops.value.every((w) => w.day === '2026-06-12')
    expect(allFriday).toBe(true)
    expect(filteredWorkshops.value.length).toBeGreaterThan(0)
    expect(filteredWorkshops.value.length).toBeLessThan(mockFestival.workshops.length)
  })

  it('filters by dance style', () => {
    const { filters, filteredWorkshops } = createSchedule(mockFestival)
    filters.danceStyle = 'bachata'
    const allBachata = filteredWorkshops.value.every((w) => w.danceStyle === 'bachata')
    expect(allBachata).toBe(true)
    expect(filteredWorkshops.value.length).toBeGreaterThan(0)
  })

  it('combines day and style filters', () => {
    const { filters, filteredWorkshops } = createSchedule(mockFestival)
    filters.day = '2026-06-13'
    filters.danceStyle = 'bachata'
    expect(filteredWorkshops.value.length).toBeGreaterThan(0)
    for (const w of filteredWorkshops.value) {
      expect(w.day).toBe('2026-06-13')
      expect(w.danceStyle).toBe('bachata')
    }
  })

  it('returns empty when filters match nothing', () => {
    const { filters, isEmpty } = createSchedule(mockFestival)
    filters.day = '2026-06-12'
    filters.danceStyle = 'reggaeton' // no reggaeton on Friday
    expect(isEmpty.value).toBe(true)
  })

  it('groups workshops by day', () => {
    const { workshopsByDay } = createSchedule(mockFestival)
    expect(workshopsByDay.value.length).toBe(3)
    // Days derived from startDate/endDate
    expect(workshopsByDay.value[0].day.date).toBe('2026-06-12')
    expect(workshopsByDay.value[1].day.date).toBe('2026-06-13')
    expect(workshopsByDay.value[2].day.date).toBe('2026-06-14')
  })

  it('extracts unique dance styles sorted alphabetically', () => {
    const { availableStyles } = createSchedule(mockFestival)
    const styles = availableStyles.value
    expect(styles.length).toBeGreaterThan(0)
    for (let i = 1; i < styles.length; i++) {
      expect(styles[i].localeCompare(styles[i - 1])).toBeGreaterThanOrEqual(0)
    }
  })

  it('enriches workshops with id and roomName', () => {
    const { filteredWorkshops } = createSchedule(mockFestival)
    for (const w of filteredWorkshops.value) {
      expect(w.id).toBeTruthy()
      expect(w.roomName).toBeTruthy()
      // roomName should be the display name, not the room ID
      expect(['Main Hall', 'Studio A', 'Studio B']).toContain(w.roomName)
    }
  })

  it('derives days from festival start/end dates', () => {
    const { days } = createSchedule(mockFestival)
    expect(days.value.length).toBe(3)
    expect(days.value[0].date).toBe('2026-06-12')
    expect(days.value[2].date).toBe('2026-06-14')
  })
})

describe('mock data (schema-aligned)', () => {
  it('has at least 15 workshops', () => {
    expect(mockFestival.workshops.length).toBeGreaterThanOrEqual(15)
  })

  it('covers 3 days via festival metadata', () => {
    expect(mockFestival.festival.startDate).toBe('2026-06-12')
    expect(mockFestival.festival.endDate).toBe('2026-06-14')
  })

  it('has rooms defined as objects with id and name', () => {
    expect(mockFestival.rooms.length).toBeGreaterThan(0)
    for (const room of mockFestival.rooms) {
      expect(room.id).toBeTruthy()
      expect(room.name).toBeTruthy()
    }
  })

  it('has concurrent workshops (same day+time, different rooms)', () => {
    const byTime = new Map<string, string[]>()
    for (const w of mockFestival.workshops) {
      const key = `${w.day}T${w.startTime}`
      if (!byTime.has(key)) byTime.set(key, [])
      byTime.get(key)!.push(w.roomId)
    }
    const hasConcurrent = [...byTime.values()].some(
      (rooms) => new Set(rooms).size > 1
    )
    expect(hasConcurrent).toBe(true)
  })

  it('has all required fields on every workshop per schema', () => {
    for (const w of mockFestival.workshops) {
      expect(w.name).toBeTruthy()
      expect(w.day).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(w.startTime).toMatch(/^\d{2}:\d{2}$/)
      expect(w.endTime).toMatch(/^\d{2}:\d{2}$/)
      expect(w.roomId).toBeTruthy()
    }
  })

  it('references only defined room IDs', () => {
    const roomIds = new Set(mockFestival.rooms.map((r) => r.id))
    for (const w of mockFestival.workshops) {
      expect(roomIds.has(w.roomId)).toBe(true)
    }
  })

  it('has festival metadata with required fields', () => {
    expect(mockFestival.festival.name).toBeTruthy()
    expect(mockFestival.festival.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(mockFestival.festival.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(mockFestival.festival.timezone).toBeTruthy()
  })
})
