<script setup lang="ts">
/**
 * /elections/<handle> — the moderator election for a free/OpenAir commons
 * (epic G800). Open verifiable ballot: candidates propose guidelines, the
 * community votes on a timestamped, attributable, editable-with-history ledger,
 * and the winner's guidelines become the space's active ruleset.
 */
import { ShieldCheck, ArrowLeft, Check, X, ScrollText, Clock, History, Trophy, Users, Plus, Inbox, Calendar } from 'lucide-vue-next'
import { NominationSchema } from '#shared/validation'

definePageMeta({ layout: false })

const route = useRoute()
const { $trpc } = useNuxtApp()
const { isSignedIn, username, isAdmin } = useAuth()

const handle = computed(() => String(route.params.handle).replace(/^@/, ''))

const pending = ref(true)
const notFound = ref(false)
const profile = ref<any>(null)
const data = ref<any>(null)         // election.forProfile result
const mine = ref<any>(null)         // election.myVote result
const queue = ref<any[]>([])        // G804: pending free-booking requests (steward)
const showAuth = ref(false)
const busy = ref('')                // id of the in-flight action, for button state
const err = ref('')

const election = computed(() => data.value?.election ?? null)
const candidates = computed<any[]>(() => data.value?.candidates ?? [])
const ledger = computed<any[]>(() => data.value?.ledger ?? [])
const phase = computed<string>(() => election.value?.status ?? 'none')
const winner = computed(() => candidates.value.find(c => c.id === election.value?.winnerCandidateId) ?? null)
// Steward = admin or the space's current elected moderator (may run the election).
const isSteward = computed(() => {
  if (isAdmin.value) return true
  const h = (profile.value?.moderatorHandle || '').replace(/^@/, '')
  return Boolean(h && username.value && h === username.value)
})

const nom = reactive({ open: false, guidelines: '', statement: '', busy: false, err: '' })
const nomForm = reactive(useFormValidation(NominationSchema, nom))

async function resolve() {
  pending.value = true
  notFound.value = false
  try {
    const pro = await $trpc.entity.getByHandle.query({ handle: handle.value })
    if (!pro) { notFound.value = true; pending.value = false; return }
    profile.value = pro.profile
    await loadElection()
    if (isSteward.value) await loadQueue()
  } catch { notFound.value = true }
  pending.value = false
}

// G804 — the elected moderator's free-booking queue.
async function loadQueue() {
  try { queue.value = await $trpc.election.pendingBookings.query({ profileId: profile.value.id }) }
  catch { queue.value = [] }
}
async function moderateBooking(id: string, action: 'accept' | 'decline') {
  busy.value = id
  try {
    await $trpc.election.moderateBooking.mutate({ bookingId: id, action })
    await loadQueue()
  } catch (e: any) { err.value = e?.message || 'Could not update that request.' }
  busy.value = ''
}
function fmtDate(d: any) { if (!d) return 'Date TBD'; try { return new Date(d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) } catch { return String(d) } }

async function loadElection() {
  data.value = await $trpc.election.forProfile.query({ profileId: profile.value.id })
  mine.value = null
  if (isSignedIn.value && election.value) {
    try { mine.value = await $trpc.election.myVote.query({ electionId: election.value.id }) } catch { /* not voted */ }
  }
}

function requireAuth(): boolean {
  if (isSignedIn.value) return true
  showAuth.value = true
  return false
}

async function openElection() {
  err.value = ''
  busy.value = 'open'
  try {
    await $trpc.election.open.mutate({ profileId: profile.value.id })
    await loadElection()
  } catch (e: any) { err.value = e?.message || 'Could not open the election.' }
  busy.value = ''
}

async function submitNomination() {
  nom.err = ''
  if (!requireAuth()) return
  const result = nomForm.validate()
  if (!result.success) return
  nom.busy = true
  try {
    await $trpc.election.nominate.mutate({ electionId: election.value.id, ...result.data })
    nom.open = false; nom.guidelines = ''; nom.statement = ''
    await loadElection()
  } catch (e: any) { nom.err = e?.message || 'Could not submit your candidacy.' }
  nom.busy = false
}

async function advance() {
  busy.value = 'advance'
  try { await $trpc.election.advanceToVoting.mutate({ electionId: election.value.id }); await loadElection() }
  catch (e: any) { err.value = e?.message || 'Could not open voting.' }
  busy.value = ''
}

async function closeElection() {
  busy.value = 'close'
  try { await $trpc.election.close.mutate({ electionId: election.value.id }); await loadElection() }
  catch (e: any) { err.value = e?.message || 'Could not close the election.' }
  busy.value = ''
}

async function vote(candidateId: string) {
  err.value = ''
  if (!requireAuth()) return
  busy.value = candidateId
  try {
    await $trpc.election.castVote.mutate({ electionId: election.value.id, candidateId })
    useTrack().track('video_vote', { kind: 'moderator_election', election_id: election.value.id })
    await loadElection()
  } catch (e: any) { err.value = e?.message || 'Could not record your vote.' }
  busy.value = ''
}

function fmt(d: any) {
  if (!d) return ''
  try { return new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return String(d) }
}
function candName(id: string) { return candidates.value.find(c => c.id === id)?.name ?? 'a candidate' }
const phaseLabel: Record<string, string> = { nominations: 'Nominations open', voting: 'Voting open', closed: 'Closed', none: 'Not started' }
const phaseColor: Record<string, string> = { nominations: '#9a5614', voting: '#16a34a', closed: '#5b3a1d', none: '#9a5614' }

watch(isSignedIn, async () => {
  if (election.value) await loadElection()
  if (isSteward.value) await loadQueue(); else queue.value = []
})
onMounted(resolve)
</script>

<template>
  <div class="min-h-screen" style="background:#fbf5ea; color:#3b1f0d; font-family:'Playfair Display', serif;">
    <SiteHeader />

    <section v-if="pending" class="max-w-2xl mx-auto px-4 py-24 text-center">
      <div class="inline-block w-8 h-8 rounded-full border-2 animate-spin" style="border-color:#dc262633; border-top-color:#dc2626;" />
    </section>

    <section v-else-if="notFound" class="max-w-xl mx-auto px-4 py-20 text-center">
      <h1 class="text-4xl">Space not found</h1>
      <p class="mt-4 text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">There's no WeDance space at <span class="font-bold">@{{ handle }}</span>.</p>
      <NuxtLink to="/cities" class="inline-flex items-center gap-1 mt-6 text-xs font-bold" style="color:#dc2626; font-family: system-ui, sans-serif;"><ArrowLeft class="w-3 h-3" /> Browse cities</NuxtLink>
    </section>

    <template v-else>
      <!-- Header -->
      <section class="max-w-2xl mx-auto px-4 pt-12 pb-4" style="font-family: system-ui, sans-serif;">
        <NuxtLink :to="`/@${handle}`" class="inline-flex items-center gap-1 text-xs font-bold mb-4" style="color:#dc2626;"><ArrowLeft class="w-3 h-3" /> {{ profile.name }}</NuxtLink>
        <div class="rounded-2xl overflow-hidden bg-white border" style="border-color:#dc262633; box-shadow:0 10px 28px rgba(59,31,18,0.06);">
          <div class="h-2" style="background:linear-gradient(135deg,#dc2626,#f97316);" />
          <div class="p-6 sm:p-8">
            <div class="flex items-center gap-2">
              <ShieldCheck class="w-4 h-4" style="color:#dc2626;" />
              <span class="text-[10px] uppercase tracking-[0.3em] font-bold" style="color:#9a5614;">Moderator election</span>
              <span class="ml-auto text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5" :style="`background:${phaseColor[phase]}18; color:${phaseColor[phase]};`">{{ phaseLabel[phase] }}</span>
            </div>
            <h1 class="text-3xl leading-tight mt-1" style="font-family:'Playfair Display', serif;">{{ profile.name }}</h1>
            <p class="mt-2 text-sm leading-relaxed" style="color:#5b3a1d;">
              This is a free, community-run space. Each year the community elects a moderator, who proposes the guidelines the space runs by. Votes are <b>public and timestamped</b> — you can always check your own vote is unchanged.
            </p>
            <div v-if="election" class="mt-3 flex flex-wrap gap-4 text-xs" style="color:#9a5614;">
              <span v-if="election.termStart" class="inline-flex items-center gap-1"><Clock class="w-3 h-3" /> Term {{ String(election.termStart).slice(0,4) }}–{{ String(election.termEnd).slice(0,4) }}</span>
              <span class="inline-flex items-center gap-1"><Users class="w-3 h-3" /> {{ data.totalVotes }} vote{{ data.totalVotes === 1 ? '' : 's' }}</span>
            </div>
          </div>
        </div>
      </section>

      <p v-if="err" class="max-w-2xl mx-auto px-4 text-sm" style="color:#dc2626; font-family: system-ui, sans-serif;">{{ err }}</p>

      <!-- No election yet -->
      <section v-if="!election" class="max-w-2xl mx-auto px-4 py-8 text-center" style="font-family: system-ui, sans-serif;">
        <ScrollText class="w-8 h-8 mx-auto" style="color:#9a561466;" />
        <p class="mt-3 text-sm" style="color:#5b3a1d;">No election has been held for this space yet.</p>
        <button v-if="isSteward" :disabled="busy==='open'" class="inline-flex items-center gap-2 mt-5 rounded-full px-5 py-2.5 text-white text-sm font-bold uppercase tracking-wider disabled:opacity-50" style="background:linear-gradient(135deg,#dc2626,#f97316);" @click="openElection">
          <Plus class="w-4 h-4" /> Open the first election
        </button>
      </section>

      <!-- Winner banner (closed) -->
      <section v-if="phase==='closed' && winner" class="max-w-2xl mx-auto px-4 pb-2" style="font-family: system-ui, sans-serif;">
        <div class="rounded-2xl p-5 flex items-start gap-3" style="background:#16a34a10; border:1px solid #16a34a33;">
          <Trophy class="w-6 h-6 shrink-0" style="color:#16a34a;" />
          <div>
            <div class="text-sm font-bold" style="color:#166534;">{{ winner.name }} is the elected moderator</div>
            <div class="text-xs mt-0.5" style="color:#5b3a1d;">Their guidelines are now the space's active ruleset.</div>
          </div>
        </div>
      </section>

      <!-- Candidates -->
      <section v-if="election && candidates.length" class="max-w-2xl mx-auto px-4 py-4" style="font-family: system-ui, sans-serif;">
        <h2 class="text-xs uppercase tracking-[0.28em] font-bold mb-3" style="color:#9a5614;">Candidates &amp; their guidelines</h2>
        <div class="space-y-3">
          <div v-for="c in candidates" :key="c.id" class="rounded-2xl bg-white border p-5" :style="`border-color:${c.id===election.winnerCandidateId ? '#16a34a55' : '#dc262633'};`">
            <div class="flex items-start gap-3">
              <img v-if="c.photo" :src="c.photo" :alt="c.name" class="w-11 h-11 rounded-full object-cover" style="border:2px solid #dc262633;">
              <div v-else class="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold" style="background:linear-gradient(135deg,#dc2626,#f97316);">{{ (c.name||'?').slice(0,1) }}</div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="font-bold" style="color:#3b1f0d;">{{ c.name }}</span>
                  <NuxtLink v-if="c.username" :to="`/@${c.username}`" class="text-xs" style="color:#9a5614;">@{{ c.username }}</NuxtLink>
                  <span class="ml-auto text-xs font-bold" style="color:#dc2626;">{{ c.votes }} vote{{ c.votes===1?'':'s' }}</span>
                </div>
                <p v-if="c.statement" class="text-sm mt-1 italic" style="color:#5b3a1d;">"{{ c.statement }}"</p>
                <p class="text-sm mt-2 whitespace-pre-line" style="color:#3b1f0d;">{{ c.guidelines }}</p>
                <div v-if="phase==='voting'" class="mt-3">
                  <button
                    :disabled="busy===c.id"
                    class="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold uppercase tracking-wider disabled:opacity-50"
                    :style="mine?.candidateId===c.id
                      ? 'background:#16a34a; color:#fff;'
                      : 'background:#dc262614; color:#dc2626; border:1px solid #dc262633;'"
                    @click="vote(c.id)">
                    <Check v-if="mine?.candidateId===c.id" class="w-3.5 h-3.5" />
                    {{ mine?.candidateId===c.id ? 'Your vote' : (mine?.candidateId ? 'Switch to this' : 'Vote') }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Your vote (trust panel) -->
      <section v-if="election && mine?.candidateId" class="max-w-2xl mx-auto px-4 py-2" style="font-family: system-ui, sans-serif;">
        <div class="rounded-2xl p-4 text-sm" style="background:#fff7ed; border:1px solid #f9741633; color:#9a3412;">
          <div class="flex items-center gap-1.5 font-bold"><History class="w-4 h-4" /> Your vote is on the record</div>
          <p class="mt-1">You're currently backing <b>{{ candName(mine.candidateId) }}</b><span v-if="mine.history?.length > 1"> · changed {{ mine.history.length - 1 }} time{{ mine.history.length-1===1?'':'s' }}</span><span v-if="mine.lastChangedAt"> · last set {{ fmt(mine.lastChangedAt) }}</span>. Anyone can see it in the ledger below — so a friend can confirm it's unchanged.</p>
        </div>
      </section>

      <!-- Nominate (nominations phase) -->
      <section v-if="phase==='nominations'" class="max-w-2xl mx-auto px-4 py-4" style="font-family: system-ui, sans-serif;">
        <div v-if="!nom.open">
          <button class="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-white text-sm font-bold uppercase tracking-wider" style="background:linear-gradient(135deg,#dc2626,#f97316);" @click="requireAuth() && (nom.open = true)">
            <Plus class="w-4 h-4" /> Stand as a candidate
          </button>
        </div>
        <div v-else class="rounded-2xl bg-white border p-5" style="border-color:#dc262633;">
          <h3 class="font-bold" style="color:#3b1f0d;">Your candidacy</h3>
          <p class="text-xs mt-1" style="color:#9a5614;">Propose the guidelines you'd run the space by. The community elects you on this.</p>
          <label class="block text-xs font-bold mt-4 mb-1" style="color:#5b3a1d;">Guidelines the space would run by</label>
          <textarea v-model="nom.guidelines" rows="5" class="w-full rounded-lg border px-3 py-2 text-sm" style="border-color:#dc262633; background:#fbf5ea;" placeholder="e.g. Open to all levels; no reserved slots before 6pm; keep the volume neighbour-friendly after 22:00…" v-bind="nomForm.fieldAttrs('guidelines', 'nom-guidelines-error')" />
          <FieldError id="nom-guidelines-error" :message="nomForm.errors.guidelines" />
          <label class="block text-xs font-bold mt-3 mb-1" style="color:#5b3a1d;">Short pitch (optional)</label>
          <input v-model="nom.statement" maxlength="600" class="w-full rounded-lg border px-3 py-2 text-sm" style="border-color:#dc262633; background:#fbf5ea;" placeholder="One line on why you'd steward it well." v-bind="nomForm.fieldAttrs('statement', 'nom-statement-error')">
          <FieldError id="nom-statement-error" :message="nomForm.errors.statement" />
          <p v-if="nom.err" class="text-xs mt-2" style="color:#dc2626;">{{ nom.err }}</p>
          <div class="flex gap-2 mt-4">
            <button :disabled="nom.busy" class="rounded-full px-5 py-2 text-white text-sm font-bold uppercase tracking-wider disabled:opacity-50" style="background:linear-gradient(135deg,#dc2626,#f97316);" @click="submitNomination">Submit candidacy</button>
            <button class="rounded-full px-4 py-2 text-sm font-bold" style="color:#9a5614;" @click="nom.open = false; nomForm.reset()">Cancel</button>
          </div>
        </div>
      </section>

      <!-- Open ledger -->
      <section v-if="election && ledger.length" class="max-w-2xl mx-auto px-4 py-4" style="font-family: system-ui, sans-serif;">
        <h2 class="text-xs uppercase tracking-[0.28em] font-bold mb-1" style="color:#9a5614;">The ledger</h2>
        <p class="text-xs mb-3" style="color:#5b3a1d;">
          Every vote, timestamped and public.
          <span v-if="!data.viewerSignedIn">Sign in to see who each vote belongs to.</span>
          <span v-else>Voter identity is shown to signed-in members only.</span>
        </p>
        <div class="rounded-2xl bg-white border divide-y" style="border-color:#dc262633; --tw-divide-opacity:1; border-color:#dc262633;">
          <div v-for="(v, i) in ledger" :key="i" class="flex items-center gap-3 px-4 py-2.5 text-sm">
            <template v-if="v.voter">
              <img v-if="v.voter.photo" :src="v.voter.photo" class="w-6 h-6 rounded-full object-cover" :alt="v.voter.name">
              <div v-else class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold" style="background:#9a5614;">{{ (v.voter.name||'?').slice(0,1) }}</div>
              <span style="color:#3b1f0d;">{{ v.voter.name }}</span>
            </template>
            <template v-else>
              <div class="w-6 h-6 rounded-full flex items-center justify-center" style="background:#dc262614;"><Users class="w-3 h-3" style="color:#9a5614;" /></div>
              <span style="color:#9a5614;">A member</span>
            </template>
            <span style="color:#5b3a1d;">→ {{ candName(v.candidateId) }}</span>
            <span v-if="v.changed" class="text-[10px] font-bold uppercase rounded-full px-1.5 py-0.5" style="background:#9a561418; color:#9a5614;">changed</span>
            <span class="ml-auto text-xs" style="color:#9a5614;">{{ fmt(v.votedAt) }}</span>
          </div>
        </div>
      </section>

      <!-- Booking queue (G804) — the elected moderator approves/declines free bookings -->
      <section v-if="isSteward" class="max-w-2xl mx-auto px-4 py-4" style="font-family: system-ui, sans-serif;">
        <h2 class="text-xs uppercase tracking-[0.28em] font-bold mb-1" style="color:#9a5614;">Booking queue</h2>
        <p class="text-xs mb-3" style="color:#5b3a1d;">Pending requests for the free floor. Approve against the active guidelines — accepted slots show up in the space's schedule.</p>
        <div v-if="!queue.length" class="rounded-2xl bg-white border p-6 text-center text-sm" style="border-color:#dc262633; color:#9a5614;">
          <Inbox class="w-6 h-6 mx-auto mb-2" style="color:#9a561466;" /> No pending requests.
        </div>
        <div v-else class="space-y-3">
          <div v-for="b in queue" :key="b.id" class="rounded-2xl bg-white border p-4" style="border-color:#dc262633;">
            <div class="flex items-start gap-3">
              <div class="min-w-0 flex-1">
                <div class="font-bold" style="color:#3b1f0d;">{{ b.title || 'Untitled event' }}<span v-if="b.eventType" class="ml-2 text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5" style="background:#dc262614; color:#dc2626;">{{ b.eventType }}</span></div>
                <div class="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs" style="color:#9a5614;">
                  <span class="inline-flex items-center gap-1"><Calendar class="w-3 h-3" /> {{ fmtDate(b.eventDate) }}<span v-if="b.startTime"> · {{ b.startTime }}<span v-if="b.endTime">–{{ b.endTime }}</span></span></span>
                  <span v-if="b.requesterName || b.requesterEmail" class="inline-flex items-center gap-1"><Users class="w-3 h-3" /> {{ b.requesterName || b.requesterEmail }}</span>
                </div>
                <p v-if="b.message" class="text-sm mt-2" style="color:#5b3a1d;">{{ b.message }}</p>
              </div>
            </div>
            <div class="flex gap-2 mt-3">
              <button :disabled="busy===b.id" class="inline-flex items-center gap-1 rounded-full px-4 py-1.5 text-sm font-bold text-white disabled:opacity-50" style="background:#16a34a;" @click="moderateBooking(b.id, 'accept')"><Check class="w-3.5 h-3.5" /> Approve</button>
              <button :disabled="busy===b.id" class="inline-flex items-center gap-1 rounded-full px-4 py-1.5 text-sm font-bold disabled:opacity-50" style="background:#dc262614; color:#dc2626; border:1px solid #dc262633;" @click="moderateBooking(b.id, 'decline')"><X class="w-3.5 h-3.5" /> Decline</button>
            </div>
          </div>
        </div>
      </section>

      <!-- Steward controls -->
      <section v-if="election && isSteward && phase!=='closed'" class="max-w-2xl mx-auto px-4 py-6" style="font-family: system-ui, sans-serif;">
        <div class="rounded-2xl p-4" style="background:#3b1f0d08; border:1px dashed #3b1f0d33;">
          <div class="text-[10px] uppercase tracking-[0.28em] font-bold mb-2" style="color:#9a5614;">Steward controls</div>
          <div class="flex flex-wrap gap-2">
            <button v-if="phase==='nominations'" :disabled="busy==='advance' || !candidates.length" class="rounded-full px-4 py-2 text-sm font-bold text-white disabled:opacity-50" style="background:#16a34a;" @click="advance">Open voting</button>
            <button v-if="phase==='voting'" :disabled="busy==='close'" class="rounded-full px-4 py-2 text-sm font-bold text-white disabled:opacity-50" style="background:#dc2626;" @click="closeElection">Close &amp; declare winner</button>
          </div>
        </div>
      </section>
    </template>

    <SignUpModal v-model:open="showAuth" action="signin" />
  </div>
</template>
