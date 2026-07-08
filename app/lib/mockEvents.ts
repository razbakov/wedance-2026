/**
 * Lookup for the mock city weekly events (mock-city-*.ts) so they can open an
 * event page at /events/<id> just like real booked events. Maps a CityEvent into
 * the same shape booking.getEvent returns, so /events/<id> renders either.
 * Transitional until city events are real DB rows.
 */
import * as munich from '~/data/mock-city-munich'
import * as berlin from '~/data/mock-city-berlin'
import type { CityEvent } from '~/types/city'

const CITIES = [
  { data: munich, cityName: munich.city.name },
  { data: berlin, cityName: berlin.city.name },
]

// This week's date (YYYY-MM-DD) for a weekday name — recurring socials happen
// "this" week.
function thisWeekDateFor(dayName: string): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const target = days.indexOf(dayName)
  if (target < 0) return ''
  const now = new Date()
  const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const fromMon = (target + 6) % 7 // Mon→0 … Sun→6
  const d = new Date(mon); d.setDate(mon.getDate() + fromMon)
  return d.toISOString().slice(0, 10)
}

function mapEvent(e: CityEvent, cityName: string) {
  return {
    id: e.id,
    title: e.name,
    eventType: e.type ? e.type.charAt(0).toUpperCase() + e.type.slice(1) : null,
    styles: e.style ? [e.style] : [],
    artists: [] as string[],
    eventDate: e.date || thisWeekDateFor(e.day),
    startTime: e.time || null,
    endTime: null,
    headcount: e.attendeeCount || null,
    message: e.description || null,
    requesterName: e.organizer || null,
    status: 'accepted',
    ticketUrl: null,
    spaceName: null as string | null,
    venueName: e.venue || null,
    venueHandle: null as string | null,
    venueAddress: e.address || null,
    venueCity: cityName,
  }
}

export function findMockEvent(id: string) {
  for (const { data, cityName } of CITIES) {
    const e = (data.events as CityEvent[]).find(ev => ev.id === id)
    if (e) return mapEvent(e, cityName)
  }
  return null
}
