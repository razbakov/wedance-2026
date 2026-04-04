import type {
  FestivalSchedule,
  WorkshopWithId,
  DanceStyle,
  FestivalDay,
  Room,
} from '~/types/schedule'

export interface ScheduleFilters {
  day: string | null // ISO date string or null for "all days"
  danceStyle: DanceStyle | null // null for "all styles"
}

/**
 * Build a lookup map from room ID to room name.
 */
function buildRoomMap(rooms: Room[]): Map<string, string> {
  return new Map(rooms.map((r) => [r.id, r.name]))
}

/**
 * Derive the list of FestivalDay objects from festival metadata.
 * Generates one entry per day from startDate to endDate.
 *
 * Uses noon UTC to avoid timezone edge cases when extracting the date part.
 */
function deriveDays(startDate: string, endDate: string): FestivalDay[] {
  const days: FestivalDay[] = []
  const start = new Date(startDate + 'T12:00:00Z')
  const end = new Date(endDate + 'T12:00:00Z')

  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString('en-GB', {
      weekday: 'long',
      timeZone: 'UTC',
    })
    days.push({ date: iso, label })
  }
  return days
}

/**
 * Generate a stable ID for a workshop based on its day, time, and room.
 * The schema does not require workshop IDs, so we derive them for Vue keying.
 */
function workshopId(w: { day: string; startTime: string; roomId: string }): string {
  return `${w.day}-${w.startTime}-${w.roomId}`
}

/**
 * Enrich raw workshops with generated IDs and resolved room names.
 */
function enrichWorkshops(
  festival: FestivalSchedule
): WorkshopWithId[] {
  const roomMap = buildRoomMap(festival.rooms)
  return festival.workshops.map((w) => ({
    ...w,
    id: workshopId(w),
    roomName: roomMap.get(w.roomId) ?? w.roomId,
  }))
}

export function useSchedule(festival: FestivalSchedule) {
  const filters = reactive<ScheduleFilters>({
    day: null,
    danceStyle: null,
  })

  const days = computed<FestivalDay[]>(() =>
    deriveDays(festival.festival.startDate, festival.festival.endDate)
  )

  const workshops = computed<WorkshopWithId[]>(() => enrichWorkshops(festival))

  /** All unique dance styles present in the schedule, sorted alphabetically. */
  const availableStyles = computed<DanceStyle[]>(() => {
    const styles = new Set(
      festival.workshops
        .map((w) => w.danceStyle)
        .filter((s): s is DanceStyle => s !== undefined)
    )
    return [...styles].sort() as DanceStyle[]
  })

  /** Workshops after applying active filters, sorted by start time. */
  const filteredWorkshops = computed<WorkshopWithId[]>(() => {
    let result = [...workshops.value]

    if (filters.day) {
      result = result.filter((w) => w.day === filters.day)
    }

    if (filters.danceStyle) {
      result = result.filter((w) => w.danceStyle === filters.danceStyle)
    }

    result.sort((a, b) => {
      // Sort by day first, then by startTime (HH:MM string comparison works for 24h format)
      const dayCompare = a.day.localeCompare(b.day)
      if (dayCompare !== 0) return dayCompare
      return a.startTime.localeCompare(b.startTime)
    })

    return result
  })

  /** Workshops grouped by day, each group sorted chronologically. */
  const workshopsByDay = computed<{ day: FestivalDay; workshops: WorkshopWithId[] }[]>(
    () => {
      const activeDays = filters.day
        ? days.value.filter((d) => d.date === filters.day)
        : days.value

      return activeDays.map((day) => ({
        day,
        workshops: filteredWorkshops.value.filter((w) => w.day === day.date),
      }))
    }
  )

  /** True when filters produce zero results. */
  const isEmpty = computed(() => filteredWorkshops.value.length === 0)

  function setDay(date: string | null) {
    filters.day = date
  }

  function setDanceStyle(style: DanceStyle | null) {
    filters.danceStyle = style
  }

  function clearFilters() {
    filters.day = null
    filters.danceStyle = null
  }

  return {
    filters,
    days,
    availableStyles,
    filteredWorkshops,
    workshopsByDay,
    isEmpty,
    setDay,
    setDanceStyle,
    clearFilters,
  }
}
