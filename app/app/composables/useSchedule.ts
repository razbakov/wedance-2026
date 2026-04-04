import type { Festival, Workshop, DanceStyle, FestivalDay } from '~/types/schedule'

export interface ScheduleFilters {
  day: string | null // ISO date string or null for "all days"
  danceStyle: DanceStyle | null // null for "all styles"
}

export function useSchedule(festival: Festival) {
  const filters = reactive<ScheduleFilters>({
    day: null,
    danceStyle: null,
  })

  /** All unique dance styles present in the schedule, sorted alphabetically. */
  const availableStyles = computed<DanceStyle[]>(() => {
    const styles = new Set(festival.workshops.map((w) => w.danceStyle))
    return [...styles].sort() as DanceStyle[]
  })

  /** Workshops after applying active filters, sorted by start time. */
  const filteredWorkshops = computed<Workshop[]>(() => {
    let result = [...festival.workshops]

    if (filters.day) {
      result = result.filter((w) => w.startTime.startsWith(filters.day!))
    }

    if (filters.danceStyle) {
      result = result.filter((w) => w.danceStyle === filters.danceStyle)
    }

    result.sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )

    return result
  })

  /** Workshops grouped by day, each group sorted chronologically. */
  const workshopsByDay = computed<{ day: FestivalDay; workshops: Workshop[] }[]>(
    () => {
      const days = filters.day
        ? festival.days.filter((d) => d.date === filters.day)
        : festival.days

      return days.map((day) => ({
        day,
        workshops: filteredWorkshops.value.filter((w) =>
          w.startTime.startsWith(day.date)
        ),
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
    availableStyles,
    filteredWorkshops,
    workshopsByDay,
    isEmpty,
    setDay,
    setDanceStyle,
    clearFilters,
  }
}
