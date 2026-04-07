<script setup lang="ts">
import type { DanceRole, DancePartner } from '~/types/festival'
import { Button } from '~/components/ui/button'
import { Plus } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  workshopTitle: string
  rememberedRole: DanceRole | null
  partners: DancePartner[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [role: DanceRole, hasPartner: boolean, remember: boolean, partnerId?: string]
  'add-partner': [name: string]
}>()

const step = ref<'role' | 'partner' | 'pick-partner'>('role')
const selectedRole = ref<DanceRole | null>(null)
const remember = ref(true)
const newPartnerName = ref('')

watch(() => props.open, (val) => {
  if (val) {
    newPartnerName.value = ''
    if (props.rememberedRole) {
      selectedRole.value = props.rememberedRole
      step.value = 'partner'
      remember.value = true
    } else {
      selectedRole.value = null
      step.value = 'role'
      remember.value = true
    }
  }
})

function pickRole(role: DanceRole) {
  selectedRole.value = role
  step.value = 'partner'
}

function pickHasPartner(has: boolean) {
  if (has) {
    step.value = 'pick-partner'
  } else {
    emit('confirm', selectedRole.value!, false, remember.value)
    emit('update:open', false)
  }
}

function selectPartner(partnerId: string) {
  emit('confirm', selectedRole.value!, true, remember.value, partnerId)
  emit('update:open', false)
}

function createAndSelect() {
  const name = newPartnerName.value.trim()
  if (!name) return
  emit('add-partner', name)
  // Find the partner by name after it's added (next tick)
  nextTick(() => {
    const partner = props.partners.find((p) => p.name === name)
    if (partner) {
      selectPartner(partner.id)
    }
  })
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle class="text-base">{{ workshopTitle }}</DialogTitle>
        <DialogDescription>Tell us about your role for this workshop.</DialogDescription>
      </DialogHeader>

      <!-- Step 1: Role -->
      <div v-if="step === 'role'" class="space-y-3 py-2">
        <p class="text-sm font-medium">Are you dancing as…</p>
        <div class="grid grid-cols-2 gap-3">
          <Button variant="outline" class="h-12 text-sm" @click="pickRole('lead')">
            Lead
          </Button>
          <Button variant="outline" class="h-12 text-sm" @click="pickRole('follow')">
            Follow
          </Button>
        </div>
        <label class="flex items-center gap-2 pt-1 cursor-pointer">
          <input v-model="remember" type="checkbox" class="rounded border-input" />
          <span class="text-xs text-muted-foreground">Remember my choices for all workshops</span>
        </label>
      </div>

      <!-- Step 2: Has partner? -->
      <div v-else-if="step === 'partner'" class="space-y-3 py-2">
        <p class="text-sm">
          You're joining as <span class="font-semibold">{{ selectedRole === 'lead' ? 'Lead' : 'Follow' }}</span>.
          <button class="text-primary text-xs hover:underline ml-1" @click="step = 'role'">Change</button>
        </p>
        <p class="text-sm font-medium">Do you have a dance partner?</p>
        <div class="grid grid-cols-2 gap-3">
          <Button variant="outline" class="h-12 text-sm" @click="pickHasPartner(true)">
            Yes, I have a partner
          </Button>
          <Button variant="outline" class="h-12 text-sm" @click="pickHasPartner(false)">
            No, I'm looking
          </Button>
        </div>
        <label v-if="!rememberedRole" class="flex items-center gap-2 pt-1 cursor-pointer">
          <input v-model="remember" type="checkbox" class="rounded border-input" />
          <span class="text-xs text-muted-foreground">Remember my choices for all workshops</span>
        </label>
      </div>

      <!-- Step 3: Pick which partner -->
      <div v-else-if="step === 'pick-partner'" class="space-y-3 py-2">
        <p class="text-sm">
          <button class="text-primary text-xs hover:underline" @click="step = 'partner'">← Back</button>
        </p>
        <p class="text-sm font-medium">Who is your partner?</p>

        <!-- Existing partners -->
        <div v-if="partners.length" class="space-y-2">
          <Button
            v-for="p in partners"
            :key="p.id"
            variant="outline"
            class="w-full justify-start h-10 text-sm"
            @click="selectPartner(p.id)"
          >
            {{ p.name }}
          </Button>
        </div>

        <!-- Add new partner -->
        <div class="flex gap-2">
          <input
            v-model="newPartnerName"
            type="text"
            placeholder="Partner's name"
            class="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
            @keydown.enter="createAndSelect"
          />
          <Button
            variant="outline"
            size="sm"
            class="h-10 px-3"
            :disabled="!newPartnerName.trim()"
            @click="createAndSelect"
          >
            <Plus class="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
