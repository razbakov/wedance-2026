import type { BusinessEventValues } from '~/components/business/BusinessEventForm.vue'

/**
 * An empty /business event form. A new event starts as a DRAFT (RAZ-927), like
 * the Instagram import and the AI app: publishing is a step of its own, in the
 * editor (or "Publish it now" ticked on purpose in the create form).
 */
export function blankBusinessEvent(): BusinessEventValues {
  return {
    hostUsername: '', name: '', type: 'Party', date: '', startTime: '20:00', endTime: '', endDate: '',
    city: '', venueUsername: null, venueName: '', venueAddress: '', artists: [], coOrganizers: [], styles: [],
    description: '', cover: '', ticketUrl: '', price: '', published: false,
    agenda: [], showAgenda: true, photos: {}, names: {}, festival: null,
  }
}

/** /business event form values → businessEvents.create / update input (empty strings become null). */
export function toBusinessEventInput(v: BusinessEventValues) {
  return {
    hostUsername: v.hostUsername,
    name: v.name,
    type: v.type as 'Party' | 'Workshop' | 'Course' | 'Festival' | 'Weekender' | 'Congress' | 'Concert' | 'Show',
    date: v.date,
    startTime: v.startTime,
    endTime: v.endTime || null,
    endDate: v.endDate || null,
    city: v.city || null,
    venueUsername: v.venueUsername || null,
    venueName: v.venueName || null,
    venueAddress: v.venueAddress || null,
    artists: v.artists,
    coOrganizers: v.coOrganizers.map(c => (c.role?.trim() ? { username: c.username, role: c.role.trim() } : { username: c.username })),
    styles: v.styles,
    description: v.description,
    cover: v.cover || null,
    ticketUrl: v.ticketUrl || null,
    price: v.price,
    published: v.published,
    agenda: v.agenda,
    // Only the line-up's photo choices; a removed artist's choice is dropped.
    festival: v.festival
      ? { ...v.festival, logo: v.festival.logo || '', accentColor: v.festival.accentColor || '' }
      : null,
    flyerOptions: {
      showAgenda: v.showAgenda,
      photos: Object.fromEntries(Object.entries(v.photos).filter(([h]) => v.artists.includes(h))),
      names: Object.fromEntries(Object.entries(v.names).filter(([h, n]) => v.artists.includes(h) && n.trim())),
    },
  }
}

/**
 * The closed Line-up card's one line (RAZ-988): how many, then the first few
 * names as the event names them (else the @handle).
 */
export function lineupSummary(artists: string[], names: Record<string, string> = {}, shown = 4): string {
  if (!artists.length) return 'No one yet'
  const label = (h: string) => names[h]?.trim() || `@${h}`
  const first = artists.slice(0, shown).map(label).join(', ')
  const rest = artists.length - shown
  const count = `${artists.length} ${artists.length === 1 ? 'artist' : 'artists'}`
  return `${count}: ${first}${rest > 0 ? ` and ${rest} more` : ''}`
}
