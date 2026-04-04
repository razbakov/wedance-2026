import { describe, it, expect } from 'vitest'
import { reactive, computed } from 'vue'
import { rovinjFestival } from '~/data/festivals/rovinj-summer-bachata-2026'
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

  /**
   * Workshops grouped by (day, startTime) pairs for horizontal card row layout.
   */
  const workshopsByTimeSlot = computed<
    { day: FestivalDay; timeSlots: { time: string; workshops: WorkshopWithId[] }[] }[]
  >(() => {
    const activeDays = filters.day
      ? days.value.filter((d) => d.date === filters.day)
      : days.value

    return activeDays.map((day) => {
      const dayWorkshops = filteredWorkshops.value.filter((w) => w.day === day.date)
      const timeMap = new Map<string, WorkshopWithId[]>()
      for (const w of dayWorkshops) {
        if (!timeMap.has(w.startTime)) {
          timeMap.set(w.startTime, [])
        }
        timeMap.get(w.startTime)!.push(w)
      }
      const timeSlots = [...timeMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([time, workshops]) => ({
          time,
          workshops: workshops.sort((a, b) => a.roomName.localeCompare(b.roomName)),
        }))
      return { day, timeSlots }
    })
  })

  return { filters, days, availableStyles, filteredWorkshops, workshopsByDay, workshopsByTimeSlot, isEmpty }
}

const rovinjSchedule = rovinjFestival.schedule

describe('useSchedule with Rovinj data', () => {
  it('returns all workshops when no filters are active', () => {
    const { filteredWorkshops } = createSchedule(rovinjSchedule)
    expect(filteredWorkshops.value.length).toBe(rovinjSchedule.workshops.length)
  })

  it('sorts workshops chronologically', () => {
    const { filteredWorkshops } = createSchedule(rovinjSchedule)
    const keys = filteredWorkshops.value.map((w) => `${w.day}T${w.startTime}`)
    for (let i = 1; i < keys.length; i++) {
      expect(keys[i].localeCompare(keys[i - 1])).toBeGreaterThanOrEqual(0)
    }
  })

  it('filters by day', () => {
    const { filters, filteredWorkshops } = createSchedule(rovinjSchedule)
    filters.day = '2026-06-05'
    const allThursday = filteredWorkshops.value.every((w) => w.day === '2026-06-05')
    expect(allThursday).toBe(true)
    expect(filteredWorkshops.value.length).toBeGreaterThan(0)
    expect(filteredWorkshops.value.length).toBeLessThan(rovinjSchedule.workshops.length)
  })

  it('filters by dance style', () => {
    const { filters, filteredWorkshops } = createSchedule(rovinjSchedule)
    filters.danceStyle = 'bachata'
    const allBachata = filteredWorkshops.value.every((w) => w.danceStyle === 'bachata')
    expect(allBachata).toBe(true)
    expect(filteredWorkshops.value.length).toBeGreaterThan(0)
  })

  it('combines day and style filters', () => {
    const { filters, filteredWorkshops } = createSchedule(rovinjSchedule)
    filters.day = '2026-06-06'
    filters.danceStyle = 'bachata'
    expect(filteredWorkshops.value.length).toBeGreaterThan(0)
    for (const w of filteredWorkshops.value) {
      expect(w.day).toBe('2026-06-06')
      expect(w.danceStyle).toBe('bachata')
    }
  })

  it('returns empty when filters match nothing', () => {
    const { filters, isEmpty } = createSchedule(rovinjSchedule)
    filters.day = '2026-06-08'
    filters.danceStyle = 'salsa-cubana' // no salsa cubana on Sunday
    expect(isEmpty.value).toBe(true)
  })

  it('groups workshops into 4 days', () => {
    const { workshopsByDay } = createSchedule(rovinjSchedule)
    expect(workshopsByDay.value.length).toBe(4)
    expect(workshopsByDay.value[0].day.date).toBe('2026-06-05')
    expect(workshopsByDay.value[1].day.date).toBe('2026-06-06')
    expect(workshopsByDay.value[2].day.date).toBe('2026-06-07')
    expect(workshopsByDay.value[3].day.date).toBe('2026-06-08')
  })

  it('extracts unique dance styles sorted alphabetically', () => {
    const { availableStyles } = createSchedule(rovinjSchedule)
    const styles = availableStyles.value
    expect(styles.length).toBeGreaterThan(0)
    for (let i = 1; i < styles.length; i++) {
      expect(styles[i].localeCompare(styles[i - 1])).toBeGreaterThanOrEqual(0)
    }
  })

  it('enriches workshops with id and roomName', () => {
    const { filteredWorkshops } = createSchedule(rovinjSchedule)
    for (const w of filteredWorkshops.value) {
      expect(w.id).toBeTruthy()
      expect(w.roomName).toBeTruthy()
      // roomName should not be the raw room ID
      expect(w.roomName).not.toBe(w.roomId)
    }
  })

  it('derives days from festival start/end dates', () => {
    const { days } = createSchedule(rovinjSchedule)
    expect(days.value.length).toBe(4)
    expect(days.value[0].date).toBe('2026-06-05')
    expect(days.value[3].date).toBe('2026-06-08')
  })

  it('groups workshops by time slot within each day', () => {
    const { filters, workshopsByTimeSlot } = createSchedule(rovinjSchedule)
    filters.day = '2026-06-05'
    const result = workshopsByTimeSlot.value
    expect(result.length).toBe(1) // only Thursday
    const thursdaySlots = result[0].timeSlots
    // Thursday has 3 time slots: 14:00, 15:15, 16:30
    expect(thursdaySlots.length).toBe(3)
    expect(thursdaySlots[0].time).toBe('14:00')
    expect(thursdaySlots[1].time).toBe('15:15')
    expect(thursdaySlots[2].time).toBe('16:30')
  })

  it('places concurrent workshops in the same time slot', () => {
    const { filters, workshopsByTimeSlot } = createSchedule(rovinjSchedule)
    filters.day = '2026-06-05'
    const thursdaySlots = workshopsByTimeSlot.value[0].timeSlots
    // 14:00 slot has 3 concurrent workshops (main-hall, hall-2, studio)
    expect(thursdaySlots[0].workshops.length).toBe(3)
  })

  it('sorts workshops within a time slot by room name', () => {
    const { filters, workshopsByTimeSlot } = createSchedule(rovinjSchedule)
    filters.day = '2026-06-05'
    const slot14 = workshopsByTimeSlot.value[0].timeSlots[0]
    const roomNames = slot14.workshops.map((w) => w.roomName)
    for (let i = 1; i < roomNames.length; i++) {
      expect(roomNames[i].localeCompare(roomNames[i - 1])).toBeGreaterThanOrEqual(0)
    }
  })

  it('time slots are sorted chronologically', () => {
    const { workshopsByTimeSlot } = createSchedule(rovinjSchedule)
    for (const dayGroup of workshopsByTimeSlot.value) {
      for (let i = 1; i < dayGroup.timeSlots.length; i++) {
        expect(dayGroup.timeSlots[i].time.localeCompare(dayGroup.timeSlots[i - 1].time)).toBeGreaterThan(0)
      }
    }
  })
})

describe('Rovinj schedule data validation', () => {
  it('has 30 workshops', () => {
    expect(rovinjSchedule.workshops.length).toBe(30)
  })

  it('covers 4 days via festival metadata', () => {
    expect(rovinjSchedule.festival.startDate).toBe('2026-06-05')
    expect(rovinjSchedule.festival.endDate).toBe('2026-06-08')
  })

  it('has rooms defined as objects with id and name', () => {
    expect(rovinjSchedule.rooms.length).toBeGreaterThan(0)
    for (const room of rovinjSchedule.rooms) {
      expect(room.id).toBeTruthy()
      expect(room.name).toBeTruthy()
    }
  })

  it('has concurrent workshops (same day+time, different rooms)', () => {
    const byTime = new Map<string, string[]>()
    for (const w of rovinjSchedule.workshops) {
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
    for (const w of rovinjSchedule.workshops) {
      expect(w.name).toBeTruthy()
      expect(w.day).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(w.startTime).toMatch(/^\d{2}:\d{2}$/)
      expect(w.endTime).toMatch(/^\d{2}:\d{2}$/)
      expect(w.roomId).toBeTruthy()
    }
  })

  it('references only defined room IDs', () => {
    const roomIds = new Set(rovinjSchedule.rooms.map((r) => r.id))
    for (const w of rovinjSchedule.workshops) {
      expect(roomIds.has(w.roomId)).toBe(true)
    }
  })

  it('has festival metadata with required fields', () => {
    expect(rovinjSchedule.festival.name).toBe('Summer Bachata Festival')
    expect(rovinjSchedule.festival.city).toBe('Rovinj')
    expect(rovinjSchedule.festival.country).toBe('HR')
    expect(rovinjSchedule.festival.timezone).toBe('Europe/Zagreb')
    expect(rovinjSchedule.festival.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(rovinjSchedule.festival.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('has the correct instructor lineup', () => {
    const artists = new Set(rovinjSchedule.workshops.map((w) => w.artist).filter(Boolean))
    const expectedArtists = [
      'Gaby & Estefy',
      'Junior & Carolina',
      'Jorge & Indira',
      'Antoni & Belen',
      'Alan & Jessica',
      'Dado & Conny',
      'David & Ines',
      'Ofir & Ofri',
      'Edu & Fati',
      'Jorge & Monica',
      'Lisa & York',
      'Fabian & Fania',
      'Willy & Jessy',
    ]
    for (const artist of expectedArtists) {
      expect(artists.has(artist)).toBe(true)
    }
  })
})
