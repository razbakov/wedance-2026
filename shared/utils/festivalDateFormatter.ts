/**
 * Shared date formatting utilities for festival listings.
 * Used by both client components and tests to ensure consistency.
 */

export function hasEventEnded(endDate: string): boolean {
  const now = new Date()
  now.setHours(0, 0, 0, 0) // Start of today
  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0) // Start of end date
  return end < now
}

export function daysUntil(dateStr: string): string {
  const now = new Date()
  const target = new Date(dateStr)
  let diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  // Datetimes (events, e.g. "2026-10-04T12:00:00Z"): count calendar days, so an
  // event later today reads "Today", not "Tomorrow". Date-only strings unchanged.
  if (dateStr.includes('T')) {
    const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    diff = target.getTime() < now.getTime() ? -1 : Math.round((day(target) - day(now)) / 86400000)
  }
  if (diff < 0) return 'Past'
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff <= 30) return `In ${diff} days`
  if (diff <= 60) return `In ${Math.ceil(diff / 7)} weeks`
  return `In ${Math.ceil(diff / 30)} months`
}
