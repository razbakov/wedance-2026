/**
 * Service blueprint: make a page real (job J7), from a page WeDance listed on
 * its own (synced from wedance.vip, imported from Instagram, added to a
 * line-up) to a page its real owner runs, with real faces dancers can see.
 * Lanes are who acts — the page owner, WeDance (sync, review, admins) and the
 * dancers deciding whether to trust it. Hand-maintained from the code
 * (procedures named in `code`): business.requestClaim / businessTeam.requestAccess
 * → business.decideClaim (Admin → Claims), admin.addPageOwner
 * (profile_owner_suggestions), artistInvites.claim / confirmEmail
 * (/confirm/<token>), business.merge (findLikelyDuplicates), the v3 / Instagram
 * fill rules (grant() sets profiles.claimed), rsvp.people / EventWhosComing,
 * /dance-card. Re-read against the code on 2026-11-25 (RAZ-1083): the steps
 * still match the claim, merge and faces code. Not run end to end with a test
 * owner yet. Shown at /docs/blueprints/make-it-real.
 */
import type { Blueprint, BpGap, BpLaneDef, BpPhaseDef, BpStep } from './blueprint'

export const REAL_BLUEPRINT_UPDATED = '2026-11-25'

export type RealLane = 'owner' | 'system' | 'dancer'
export type RealPhase = 'appears' | 'find' | 'ask' | 'review' | 'run' | 'dupes' | 'faces' | 'trust'

export const realLanes: BpLaneDef<RealLane>[] = [
  { key: 'owner', label: 'Page owner', hint: 'Organiser, venue, artist · /business' },
  { key: 'system', label: 'WeDance', hint: 'Sync, import, admins (Admin → Claims, Users)' },
  { key: 'dancer', label: 'Dancers', hint: '/@handle, event pages, /meet' },
]

export const realPhases: BpPhaseDef<RealPhase>[] = [
  { key: 'appears', label: 'Page appears' },
  { key: 'find', label: 'Owner finds it' },
  { key: 'ask', label: 'Claim or join' },
  { key: 'review', label: 'Review' },
  { key: 'run', label: 'Owner runs it' },
  { key: 'dupes', label: 'Duplicates merged' },
  { key: 'faces', label: 'Real faces' },
  { key: 'trust', label: 'Dancers trust it' },
]

export const realSteps: BpStep<RealLane, RealPhase>[] = [
  // Page appears
  { id: 'v3-sync', phase: 'appears', lane: 'system', name: 'Synced from wedance.vip', status: 'live', marks: [], code: 'sync:v3-events → server/utils/v3ProfileSync.ts',
    note: 'Every visible wedance.vip venue, organiser, fan page and artist becomes an unclaimed 2026 page, with public fields only (name, handle, photo, bio, socials, city, styles, venue address). Dedupe by v3 id, handle, name+city, address, ≤75 m.' },
  { id: 'ig-import', phase: 'appears', lane: 'system', name: 'Imported from Instagram', status: 'live', marks: [], code: 'businessEvents.addFromInstagram · addVenue · server/utils/instagram/profileImport.ts', refs: ['#452'],
    note: 'An organiser adds an artist or venue to a line-up by Instagram handle: a page is made and filled after the response from the public profile (name, photo re-hosted, bio, city, address).' },
  { id: 'suggest', phase: 'appears', lane: 'system', name: 'Guess the owner', status: 'partial', marks: ['silent'], code: 'profile_owner_suggestions (0058) · scripts/import-page-owner-suggestions.ts',
    note: 'From wedance.vip’s own edit rule: the page is their account (v3-own), they are on its team (v3-team), or they created it (v3-creator, only if they created ≤5 pages). Stored, but only admins ever see it.' },
  { id: 'listed', phase: 'appears', lane: 'dancer', name: 'See a listed page', status: 'partial', marks: [], route: '/@handle',
    note: 'Looks like any other page: photo, bio, schedule. The only hint that nobody runs it is the small “Is this you? Claim this page →” at the bottom of the card.' },

  // Owner finds it
  { id: 'nobody-tells', phase: 'find', lane: 'system', name: 'Tell the owner', status: 'missing', marks: ['silent'],
    note: 'Nobody is emailed that their page is on WeDance — not the suggested owners, not the Instagram account. Invite emails (artistInvites.notify) go only to a page’s team, so an unclaimed page gets none.' },
  { id: 'find-self', phase: 'find', lane: 'owner', name: 'Stumble on it', status: 'live', marks: [], route: '/business/claim', code: 'business.search · findExisting',
    note: 'Three ways in: the “Claim this page” link on /@handle, search by name or pasted Instagram link on /business/claim, or Create a page, which warns “this is already on WeDance — claim it”.' },
  { id: 'invite-link', phase: 'find', lane: 'owner', name: 'Get an organiser’s link', status: 'live', marks: ['manual'], route: '/confirm/[token]', code: 'artistInvites.link',
    note: 'An organiser booking them copies a personal /confirm (artists) or /ask (venues) link. For an unclaimed page there is no email: “Nobody runs their page on WeDance yet: send them the message instead.”' },

  // Claim or join
  { id: 'claim', phase: 'ask', lane: 'owner', name: 'Ask to claim', status: 'live', marks: [], route: '/business/claim', code: 'businessTeam.requestAccess (kind claim) · business.requestClaim',
    note: 'Signed in only. “How can we confirm it’s you?” plus an evidence type (domain email, Instagram DM, website…) and a link. One request per person per page; a rejected one can be sent again.' },
  { id: 'join', phase: 'ask', lane: 'owner', name: 'Ask to join the team', status: 'live', marks: ['wait'], route: '/business/claim', code: 'businessTeam.requestAccess (kind join) → decideJoin',
    note: 'When someone runs it already, the request goes to its owners, who see it only under “Needs you” on Business home. No email; nothing reminds them.' },
  { id: 'invite-claim', phase: 'ask', lane: 'owner', name: 'Take it over from the link', status: 'live', marks: [], route: '/confirm/[token]', code: 'artistInvites.claim · confirmEmail',
    note: 'After answering, create an account (or press “That’s me” in the answer email) and, while nobody runs the page, it is theirs at once — no review. Whoever holds the link becomes owner.' },

  // Review
  { id: 'queue', phase: 'review', lane: 'system', name: 'Claim waits for an admin', status: 'partial', marks: ['wait', 'silent'], route: '/admin/claims', code: 'business.listClaims · admin badge',
    note: 'Claims and reclaims land in Admin → Claims with a count badge in the admin nav. No email to admins, no age shown in the nav, nothing chases an old claim.' },
  { id: 'check', phase: 'review', lane: 'system', name: 'Check it’s them', status: 'partial', marks: ['manual'], route: '/admin/claims', code: 'business.decideClaim',
    note: 'The admin reads the message and evidence and checks by hand — DMs the Instagram account, opens the website. Approve, reject, or “ask for more info” (emails the claimant, back to the queue on resend). Reclaim can take the old team off.' },
  { id: 'make-owner', phase: 'review', lane: 'system', name: '“Make owner”', status: 'partial', marks: ['manual'], route: '/admin/users', code: 'admin.addPageOwner · dismissSuggestion',
    note: 'In Admin → Users an admin turns a suggested owner into the owner (or anyone by email / @handle), which emails “You now manage …”. Page by page, by hand; the owner never asked.' },
  { id: 'decision', phase: 'review', lane: 'owner', name: 'Hear the answer', status: 'live', marks: [], code: 'notifyDecision · notifyInfoRequired',
    note: 'Emailed when approved, rejected or asked for more; Business → Network lists their pending and rejected requests with the admin’s note. Until then, “Sent to WeDance” and no idea how long.' },

  // Owner runs it
  { id: 'lock', phase: 'run', lane: 'system', name: 'Stop overwriting it', status: 'live', marks: [], code: 'grant() sets profiles.claimed · v3ProfileSync · profileImport',
    note: 'Once anyone is on the team the page is claimed: the wedance.vip sync and the Instagram import never write it again (re-checked at write time).' },
  { id: 'edit', phase: 'run', lane: 'owner', name: 'Fix the page', status: 'live', marks: [], route: '/business/network/[handle]',
    note: 'Name, photo, bio, city, an artist’s service area (other cities they are listed in), links, handle (old handle redirects), team and roles, Instagram connection (#501), events.' },
  { id: 'show-person', phase: 'run', lane: 'owner', name: 'Show who runs it', status: 'partial', marks: [], route: '/settings', code: 'PersonDancerSide · public page (#474)', refs: ['#474'],
    note: 'Only for the one page a person sets as “Your public page”: /@handle then shows their dancer side. The team behind any other page stays invisible.' },

  // Duplicates merged
  { id: 'dupe-warn', phase: 'dupes', lane: 'system', name: 'Spot copies', status: 'live', marks: [], code: 'server/utils/profileDupes.ts findLikelyDuplicates · business.duplicates', refs: ['#458'],
    note: 'Same Instagram (main or alias), handle, similar name in the same city, same address or ≤75 m. Warns on Create, addVenue and MCP create_my_page; lists them on the page’s Duplicates tab.' },
  { id: 'merge', phase: 'dupes', lane: 'owner', name: 'Merge into one', status: 'partial', marks: ['manual', 'wait'], route: '/business/network/[handle]', code: 'business.merge · undoMerge', refs: ['#458'],
    note: 'Only an owner of BOTH pages (or an admin). An unclaimed copy must be claimed first — another review — and one run by someone else says “ask them, or us, to merge”.' },
  { id: 'redirect', phase: 'dupes', lane: 'dancer', name: 'Old link still works', status: 'live', marks: [], route: '/@handle', code: 'entity.movedTo',
    note: 'The copy is hidden with mergedInto and /@old 301s to the kept page; followers, events and reviews move with it.' },

  // Real faces
  { id: 'whos-coming', phase: 'faces', lane: 'dancer', name: 'Who’s coming', status: 'live', marks: [], route: '/events/[id]', code: 'EventWhosComing · rsvp.poll', refs: ['RAZ-995'],
    note: 'On a night’s page, signed-in dancers see the faces and first names of people going (confirmed answers, public profiles); visitors see only counts and “Sign in”.' },
  { id: 'dance-card', phase: 'faces', lane: 'dancer', name: 'Add my face', status: 'live', marks: [], route: '/dance-card', code: 'dance_card_saved', refs: ['RAZ-1005'],
    note: 'After signing up to a night, “Add a photo” leads to the dance card: Lead / Follow, levels, photo, name, city — saved to the profile others see.' },
  { id: 'faces-page', phase: 'faces', lane: 'system', name: 'Faces on the page', status: 'missing', marks: [],
    note: '/@handle shows a follower count for artists and promoters, but no faces of regulars, followers or who is going to its next night. The real people are only on each event page.' },

  // Dancers trust it
  { id: 'run-badge', phase: 'trust', lane: 'dancer', name: 'Tell run from listed', status: 'missing', marks: ['silent'], route: '/@handle',
    note: '`managed` is known (business.canManage) but only picks the link at the bottom. No “Run by its team” mark, no “listed from wedance.vip — not checked” — a claimed page and a scraped copy look the same.' },
  { id: 'decide', phase: 'trust', lane: 'dancer', name: 'Decide to go', status: 'gap', marks: [], route: '/events/[id]',
    note: 'Trust is pieced together from what is there: a photo, the schedule, faces under Who’s coming. Nothing on the page says whether anyone checked it.' },
]

export const realGaps: BpGap[] = [
  { title: 'Owners never hear their page is here',
    why: 'Thousands of pages were synced, and for many WeDance already guesses the owner (v3-own, v3-team). But nobody is told, and invite emails skip pages without a team — so a page waits until its owner stumbles on it or an admin clicks “Make owner”.',
    fix: 'Email each suggested owner once: “Your page X is on WeDance — is it yours?” with a sign-in link that claims it. A v3-own suggestion whose email signs in becomes owner without review; v3-team / v3-creator go to the claims queue pre-filled.',
    steps: ['suggest', 'nobody-tells', 'find-self', 'make-owner'] },
  { title: 'Claims wait on a person, checked by hand',
    why: 'Every claim sits in Admin → Claims until an admin opens it, with no email and no age, and the check itself is a DM or a website visit done outside WeDance.',
    fix: 'Prove it in one step: “Claim with Instagram” — the Meta login (#501, already built for connecting) returns the account, and when it matches the page’s Instagram link (main or alias) the claim is approved on the spot (once the Meta app is out of dev mode). Email admins a daily digest of claims older than a day.',
    steps: ['claim', 'queue', 'check', 'decision'] },
  { title: 'Whoever holds the link becomes owner',
    why: 'An organiser’s /confirm link hands an unclaimed page to whoever creates an account from it, unchecked. A forwarded link or a typo’d email makes the wrong person owner, and dancers can’t tell.',
    fix: 'Keep the answer, but make the takeover an owner only when the account’s email or Instagram matches the page; otherwise make it an editor and file a claim for review.',
    steps: ['invite-link', 'invite-claim'] },
  { title: 'Duplicates need two owners',
    why: 'Merging needs an owner of both pages. The common case — my real page plus a synced copy nobody claimed — means claiming the copy first (another wait) or asking an admin.',
    fix: 'Let an owner merge an unclaimed copy that findLikelyDuplicates matches on the same Instagram account or the same address, without claiming it. Undo already exists.',
    steps: ['dupe-warn', 'merge'] },
  { title: 'Dancers can’t see who’s real',
    why: 'WeDance knows which pages are run by their team, but /@handle looks the same either way, shows no team, and keeps the faces of people going on each event page.',
    fix: 'Show “Run by <first names, faces>” on pages with a team and “Listed from wedance.vip — is this you?” on the rest; put the faces going to its next night on the page.',
    steps: ['listed', 'show-person', 'faces-page', 'run-badge', 'decide'] },
]

export const makeItRealBlueprint: Blueprint = {
  updated: REAL_BLUEPRINT_UPDATED,
  lanes: realLanes,
  phases: realPhases,
  steps: realSteps,
  gaps: realGaps,
  systemLane: 'system',
}
