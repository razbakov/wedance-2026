<script setup lang="ts">
import type { RideShare, GroupDinner, ExtraActivity } from '~/types/festival'
import { Car, BedDouble, UtensilsCrossed, Compass, ChevronDown, Check, Users, MessageCircle } from 'lucide-vue-next'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'

const props = defineProps<{
  rideShares: RideShare[]
  groupDinners: GroupDinner[]
  extraActivities: ExtraActivity[]
  lookingForRoommate: boolean
  isSignedIn: boolean
}>()

const emit = defineEmits<{
  'join-dinner': [id: string]
  'join-activity': [id: string]
  'post-ride': [ride: { type: 'offering' | 'looking'; originCity: string; date: string; seats?: number }]
  'toggle-roommate': []
  'sign-in': []
}>()

// Collapsible sections
const expandedSections = ref(new Set<string>())

function toggleSection(section: string) {
  if (expandedSections.value.has(section)) {
    expandedSections.value.delete(section)
  } else {
    expandedSections.value.add(section)
  }
}

// Ride form state
const rideMode = ref<'offering' | 'looking' | null>(null)
const rideOriginCity = ref('')
const rideDate = ref('')
const rideSeats = ref(2)

function submitRide() {
  if (!rideOriginCity.value || !rideDate.value) return
  emit('post-ride', {
    type: rideMode.value!,
    originCity: rideOriginCity.value,
    date: rideDate.value,
    seats: rideMode.value === 'offering' ? rideSeats.value : undefined,
  })
  rideOriginCity.value = ''
  rideDate.value = ''
  rideSeats.value = 2
  rideMode.value = null
}

const totalEvents = computed(() => props.groupDinners.length + props.extraActivities.length)

function isRevealDay(date?: string): boolean {
  if (!date) return false
  const today = new Date().toISOString().slice(0, 10)
  return today >= date
}
</script>

<template>
  <div class="space-y-4">
    <!-- Share a Ride -->
    <div class="rounded-lg border">
      <button
        class="w-full flex items-center gap-3 px-4 py-3"
        @click="toggleSection('rides')"
      >
        <Car class="w-4 h-4 shrink-0 text-muted-foreground" />
        <span class="text-sm font-medium flex-1 text-left">
          Share a ride
        </span>
        <Badge v-if="rideShares.length > 0 && !expandedSections.has('rides')" variant="secondary" class="text-[9px] px-1.5 py-0">
          {{ rideShares.length }} sharing
        </Badge>
        <ChevronDown class="w-4 h-4 text-muted-foreground transition-transform" :class="expandedSections.has('rides') ? 'rotate-180' : ''" />
      </button>

      <div v-if="expandedSections.has('rides')" class="px-4 pb-4 space-y-3">
        <!-- Toggle: Offering / Looking -->
        <div class="rounded-md border p-3 space-y-2">
          <div class="flex gap-2">
            <button
              class="flex-1 text-xs font-medium py-1.5 rounded-md transition-colors"
              :class="rideMode === 'offering' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'"
              @click="rideMode = rideMode === 'offering' ? null : 'offering'"
            >
              Offering a ride
            </button>
            <button
              class="flex-1 text-xs font-medium py-1.5 rounded-md transition-colors"
              :class="rideMode === 'looking' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'"
              @click="rideMode = rideMode === 'looking' ? null : 'looking'"
            >
              Looking for a ride
            </button>
          </div>

          <div v-if="rideMode" class="space-y-2">
            <div>
              <label class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">From city</label>
              <input v-model="rideOriginCity" type="text" placeholder="e.g. Munich" class="mt-0.5 w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs" />
            </div>
            <div>
              <label class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{{ rideMode === 'offering' ? 'Departure date' : 'Preferred date' }}</label>
              <input v-model="rideDate" type="date" class="mt-0.5 w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs" />
            </div>
            <div v-if="rideMode === 'offering'">
              <label class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Seats available</label>
              <input v-model.number="rideSeats" type="number" min="1" max="6" class="mt-0.5 w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs" />
            </div>
            <Button size="sm" variant="outline" class="w-full text-xs" @click="submitRide">
              Post my ride
            </Button>
          </div>
        </div>

        <!-- Others sharing rides -->
        <div v-if="rideShares.length" class="space-y-1.5">
          <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Others sharing rides</p>
          <div v-for="ride in rideShares" :key="ride.id" class="flex items-center gap-2 py-1">
            <img :src="ride.dancerPhoto" :alt="ride.dancerName" class="w-6 h-6 rounded-full" />
            <div class="min-w-0 flex-1">
              <span class="text-xs font-medium">{{ ride.dancerName }}</span>
              <span class="text-[10px] text-muted-foreground ml-1">
                {{ ride.type === 'offering' ? 'from' : 'looking from' }} {{ ride.originCity }}
                <span v-if="ride.seatsAvailable"> · {{ ride.seatsAvailable }} seats</span>
              </span>
            </div>
            <Badge variant="secondary" class="text-[9px] px-1 py-0 shrink-0">
              {{ ride.type === 'offering' ? 'Offering' : 'Looking' }}
            </Badge>
          </div>
        </div>
      </div>
    </div>

    <!-- Share a Room -->
    <div class="rounded-lg border">
      <button
        class="w-full flex items-center gap-3 px-4 py-3"
        @click="toggleSection('rooms')"
      >
        <BedDouble class="w-4 h-4 shrink-0 text-muted-foreground" />
        <span class="text-sm font-medium flex-1 text-left">
          Share a room
        </span>
        <Badge v-if="lookingForRoommate && !expandedSections.has('rooms')" variant="secondary" class="text-[9px] px-1.5 py-0 bg-green-100 text-green-700">
          Looking
        </Badge>
        <ChevronDown class="w-4 h-4 text-muted-foreground transition-transform" :class="expandedSections.has('rooms') ? 'rotate-180' : ''" />
      </button>

      <div v-if="expandedSections.has('rooms')" class="px-4 pb-4">
        <div class="rounded-md border p-3 space-y-2">
          <button
            class="w-full flex items-center justify-between"
            @click="emit('toggle-roommate')"
          >
            <div class="flex items-center gap-2">
              <BedDouble class="w-4 h-4" :class="lookingForRoommate ? 'text-primary' : 'text-muted-foreground'" />
              <span class="text-xs font-medium">Looking for a roommate?</span>
            </div>
            <div
              class="w-8 h-5 rounded-full transition-colors flex items-center px-0.5"
              :class="lookingForRoommate ? 'bg-primary' : 'bg-muted'"
            >
              <div
                class="w-4 h-4 rounded-full bg-white shadow-sm transition-transform"
                :class="lookingForRoommate ? 'translate-x-3' : 'translate-x-0'"
              />
            </div>
          </button>
          <p v-if="lookingForRoommate" class="text-[11px] text-muted-foreground">
            Other attendees looking for roommates will be able to see you. Share your plan to connect!
          </p>
        </div>
      </div>
    </div>

    <!-- Dinners & Activities -->
    <div class="rounded-lg border">
      <button
        class="w-full flex items-center gap-3 px-4 py-3"
        @click="toggleSection('dinners')"
      >
        <UtensilsCrossed class="w-4 h-4 shrink-0 text-muted-foreground" />
        <span class="text-sm font-medium flex-1 text-left">
          Dinners & activities
        </span>
        <Badge v-if="totalEvents > 0 && !expandedSections.has('dinners')" variant="secondary" class="text-[9px] px-1.5 py-0">
          {{ totalEvents }} events
        </Badge>
        <ChevronDown class="w-4 h-4 text-muted-foreground transition-transform" :class="expandedSections.has('dinners') ? 'rotate-180' : ''" />
      </button>

      <div v-if="expandedSections.has('dinners')" class="px-4 pb-4 space-y-4">
        <!-- Group Dinners -->
        <div v-if="groupDinners.length" class="space-y-3">
          <div class="flex items-center gap-2">
            <UtensilsCrossed class="w-3.5 h-3.5 text-muted-foreground" />
            <p class="text-xs font-medium">Group dinners</p>
          </div>
          <p class="text-[11px] text-muted-foreground -mt-1">
            Join a group dinner with fellow dancers — meet new friends over a meal.
          </p>
          <div v-for="dinner in groupDinners" :key="dinner.id" class="rounded-md border p-3 space-y-1.5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium">{{ dinner.day }} dinner</span>
              <div class="flex items-center gap-1">
                <Badge variant="secondary" class="text-[9px] px-1 py-0">{{ dinner.joined }}/{{ dinner.maxSize }} joined</Badge>
                <Badge
                  v-if="dinner.joined < dinner.maxSize"
                  :class="[
                    'text-[9px] px-1.5 py-0 font-semibold',
                    dinner.maxSize - dinner.joined <= 3
                      ? 'bg-orange-100 text-orange-700 border-orange-200'
                      : 'bg-green-100 text-green-700 border-green-200',
                  ]"
                  variant="outline"
                >
                  {{ dinner.maxSize - dinner.joined }} spots left
                </Badge>
                <Badge v-else variant="secondary" class="text-[9px] px-1 py-0">Full</Badge>
              </div>
            </div>
            <p class="text-[11px] text-muted-foreground">
              {{ dinner.timeSlot }}
              <span v-if="dinner.restaurant"> · {{ dinner.restaurant }}</span>
              <span v-else-if="dinner.date" class="italic"> · Restaurant revealed on {{ dinner.day }}</span>
            </p>
            <!-- Progress bar -->
            <div class="w-full bg-muted rounded-full h-1.5">
              <div class="bg-primary rounded-full h-1.5 transition-all" :style="{ width: `${(dinner.joined / dinner.maxSize) * 100}%` }" />
            </div>
            <Button
              v-if="!dinner.userJoined && dinner.joined < dinner.maxSize"
              size="sm"
              variant="outline"
              class="w-full text-xs"
              @click="emit('join-dinner', dinner.id)"
            >
              Join this dinner
            </Button>
            <template v-else-if="dinner.userJoined">
              <p class="text-xs text-primary font-medium flex items-center gap-1">
                <Check class="w-3 h-3" /> You're in!
              </p>
              <div v-if="dinner.groupChatLink" class="flex items-center gap-2 mt-1">
                <a :href="dinner.groupChatLink" target="_blank" class="text-xs text-primary hover:underline flex items-center gap-1">
                  <MessageCircle class="w-3 h-3" /> Open group chat
                </a>
                <div v-if="dinner.groupMembers?.length" class="flex -space-x-1">
                  <img v-for="m in dinner.groupMembers" :key="m.name" :src="m.photo" :alt="m.name" class="w-4 h-4 rounded-full border border-background" />
                </div>
              </div>
            </template>
            <p v-else class="text-xs text-muted-foreground">Full</p>
          </div>
        </div>

        <!-- Extra Activities -->
        <div v-if="extraActivities.length" class="space-y-3">
          <div class="flex items-center gap-2">
            <Compass class="w-3.5 h-3.5 text-muted-foreground" />
            <p class="text-xs font-medium">Extra activities</p>
          </div>
          <div v-for="activity in extraActivities" :key="activity.id" class="rounded-md border p-3 space-y-1.5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium">{{ activity.title }}</span>
              <Badge variant="secondary" class="text-[9px] px-1 py-0">
                {{ activity.participantCount }}<span v-if="activity.maxParticipants">/{{ activity.maxParticipants }}</span> joined
              </Badge>
            </div>
            <p class="text-[11px] text-muted-foreground">{{ activity.date }} · {{ activity.time }}</p>
            <p v-if="activity.description" class="text-[11px] text-muted-foreground">{{ activity.description }}</p>
            <Button
              v-if="!activity.userJoined"
              size="sm"
              variant="outline"
              class="w-full text-xs"
              @click="emit('join-activity', activity.id)"
            >
              Join
            </Button>
            <p v-else class="text-xs text-primary font-medium flex items-center gap-1">
              <Check class="w-3 h-3" /> You're in!
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
