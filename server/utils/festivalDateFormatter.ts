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
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return 'Past'
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff <= 30) return `In ${diff} days`
  if (diff <= 60) return `In ${Math.ceil(diff / 7)} weeks`
  return `In ${Math.ceil(diff / 30)} months`
}
