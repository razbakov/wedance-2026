/**
 * One item of a real event's programme, in the shape the event page uses for
 * /events/f~<key>~<session id>. The session is not its own row: it lives on
 * the parent event (events.festival), which events.festival returns.
 */
import { SESSION_TYPE_LABEL, sessionEnd, sessionType } from '#shared/utils/programme'

type SessionView = {
  festival: {
    slug: string
    name: string
    startDate: string
    endDate: string
    ticketUrl?: string | null
    venue?: { name?: string | null } | null
  }
  workshops: any[]
  teachers: any[]
}

// The festival date that falls on a given weekday (sessions carry a weekday).
function festivalDateFor(fest: SessionView, dayName: string): string {
  const start = new Date(fest.festival.startDate)
  const end = new Date(fest.festival.endDate)
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (d.toLocaleDateString('en-US', { weekday: 'long' }) === dayName) return d.toISOString().slice(0, 10)
  }
  return String(fest.festival.startDate)
}

function mapWorkshop(w: any, fest: SessionView) {
  const teacher = fest.teachers.find(t => t.id === w.teacherId)
  return {
    id: `f~${fest.festival.slug}~${w.id}`,
    title: w.title,
    eventType: SESSION_TYPE_LABEL[sessionType(w.type)],
    styles: w.style ? [w.style] : [],
    artists: teacher ? [teacher.name] : [],
    eventDate: festivalDateFor(fest, w.day),
    startTime: w.time || null,
    endTime: sessionEnd(w),
    headcount: w.goingCount || null,
    message: null as string | null,
    parentFestival: { name: fest.festival.name, slug: fest.festival.slug },
    requesterName: teacher?.name || null,
    status: 'accepted',
    ticketUrl: fest.festival.ticketUrl || null,
    spaceName: w.room || null,
    venueName: fest.festival.venue?.name || fest.festival.name,
    venueHandle: null as string | null,
    venueAddress: null as string | null,
    venueCity: null as string | null,
  }
}

/** One programme item of a real event, or null when that session isn't on it. */
export function festivalSessionEvent(view: SessionView, wid: string) {
  const w = view.workshops.find(x => x.id === wid)
  return w ? mapWorkshop(w, view) : null
}
