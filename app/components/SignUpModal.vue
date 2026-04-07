<script setup lang="ts">
const props = defineProps<{
  open: boolean
  action: string
  prefill?: { name?: string; danceStyles?: string[]; role?: 'lead' | 'follow' | 'both'; city?: string }
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { requestMagicLink } = useAuth()

const headlines: Record<string, string> = {
  signin: 'Sign in to WeDance',
  going: 'Join to save your workshop plan',
  profile: 'Join to view dancer profiles',
  share: 'Join to share your plan',
  save: 'Join to save your plan',
  onboarding: 'Almost there! Join to start discovering',
  partner: 'Join to find a dance partner',
  social: 'Join the community',
}

const DANCE_STYLES = ['Salsa', 'Bachata', 'Kizomba', 'Zouk', 'Semba', 'Afro-Cuban', 'Reggaeton', 'Cha-Cha']

// Sign in: email only. Festival actions: all fields.
const isSignIn = computed(() => props.action === 'signin')
const showExtras = computed(() => !isSignIn.value)

type Step = 'form' | 'check-email'

const step = ref<Step>('form')
const sentEmail = ref('')

const form = reactive({
  name: '',
  email: '',
  danceStyles: [] as string[],
  role: '' as '' | 'lead' | 'follow' | 'both',
  city: '',
})

const error = ref('')
const loading = ref(false)
const resendCooldown = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | null = null

// Track which fields were pre-filled from onboarding — hide them in the form
const hasPrefillName = ref(false)
const hasPrefillStyles = ref(false)
const hasPrefillRole = ref(false)
const hasPrefillCity = ref(false)

function resetForm() {
  step.value = 'form'
  sentEmail.value = ''
  form.name = ''
  form.email = ''
  form.danceStyles = []
  form.role = ''
  form.city = ''
  error.value = ''
  resendCooldown.value = 0
  hasPrefillName.value = false
  hasPrefillStyles.value = false
  hasPrefillRole.value = false
  hasPrefillCity.value = false
  if (cooldownTimer) {
    clearInterval(cooldownTimer)
    cooldownTimer = null
  }
}

watch(() => props.open, (open) => {
  if (!open) {
    resetForm()
  } else if (props.prefill) {
    if (props.prefill.name) { form.name = props.prefill.name; hasPrefillName.value = true }
    if (props.prefill.danceStyles?.length) { form.danceStyles = [...props.prefill.danceStyles]; hasPrefillStyles.value = true }
    if (props.prefill.role) { form.role = props.prefill.role; hasPrefillRole.value = true }
    if (props.prefill.city) { form.city = props.prefill.city; hasPrefillCity.value = true }
  }
})

function toggleStyle(style: string) {
  const idx = form.danceStyles.indexOf(style)
  if (idx >= 0) {
    form.danceStyles.splice(idx, 1)
  } else {
    form.danceStyles.push(style)
  }
}

function startCooldown() {
  resendCooldown.value = 60
  cooldownTimer = setInterval(() => {
    resendCooldown.value--
    if (resendCooldown.value <= 0 && cooldownTimer) {
      clearInterval(cooldownTimer)
      cooldownTimer = null
    }
  }, 1000)
}

async function handleSubmit() {
  error.value = ''

  if (!isSignIn.value && !hasPrefillName.value && !form.name.trim()) {
    error.value = 'Name is required.'
    return
  }
  if (!form.email.trim()) {
    error.value = 'Email is required.'
    return
  }

  loading.value = true
  try {
    await requestMagicLink({
      name: form.name.trim() || props.prefill?.name || undefined,
      email: form.email.trim(),
      danceStyles: [...form.danceStyles],
      role: form.role || undefined,
      city: form.city.trim() || undefined,
    })
    sentEmail.value = form.email.trim()
    step.value = 'check-email'
    startCooldown()
  } catch (e: any) {
    error.value = e.message || 'Something went wrong. Please try again.'
  } finally {
    loading.value = false
  }
}

async function handleResend() {
  if (resendCooldown.value > 0) return

  loading.value = true
  error.value = ''
  try {
    await requestMagicLink({
      name: form.name.trim() || props.prefill?.name || undefined,
      email: sentEmail.value,
      danceStyles: [...form.danceStyles],
      role: form.role || undefined,
      city: form.city.trim() || undefined,
    })
    startCooldown()
  } catch (e: any) {
    error.value = e.message || 'Failed to resend. Please try again.'
  } finally {
    loading.value = false
  }
}

function useDifferentEmail() {
  step.value = 'form'
  sentEmail.value = ''
  error.value = ''
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-md">
      <!-- Step 1: Form -->
      <template v-if="step === 'form'">
        <DialogHeader>
          <DialogTitle>{{ headlines[action] || 'Join WeDance' }}</DialogTitle>
          <DialogDescription>We'll send you a magic link to sign in.</DialogDescription>
        </DialogHeader>
        <form class="space-y-4 py-2" @submit.prevent="handleSubmit">
          <div v-if="!isSignIn && !hasPrefillName" class="space-y-2">
            <label for="signup-name" class="text-sm font-medium">Name *</label>
            <input
              id="signup-name"
              v-model="form.name"
              type="text"
              placeholder="Your name"
              required
              class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
          </div>

          <div class="space-y-2">
            <label for="signup-email" class="text-sm font-medium">Email *</label>
            <input
              id="signup-email"
              v-model="form.email"
              type="email"
              placeholder="you@example.com"
              required
              autofocus
              class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
          </div>

          <div v-if="showExtras && !hasPrefillStyles" class="space-y-2">
            <span class="text-sm font-medium">Dance styles</span>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="style in DANCE_STYLES"
                :key="style"
                type="button"
                :aria-pressed="form.danceStyles.includes(style)"
                :class="[
                  'rounded-full border px-3 py-1 text-xs transition-colors',
                  form.danceStyles.includes(style)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground hover:bg-muted',
                ]"
                @click="toggleStyle(style)"
              >
                {{ style }}
              </button>
            </div>
          </div>

          <div v-if="showExtras && !hasPrefillRole" class="space-y-2">
            <span class="text-sm font-medium">Dance role</span>
            <div class="flex gap-3">
              <label v-for="r in [{ value: 'lead', label: 'Lead' }, { value: 'follow', label: 'Follow' }, { value: 'both', label: 'Both' }]" :key="r.value" class="flex items-center gap-1.5 text-sm cursor-pointer">
                <input v-model="form.role" type="radio" name="role" :value="r.value" class="accent-primary">
                {{ r.label }}
              </label>
            </div>
          </div>

          <div v-if="showExtras && !hasPrefillCity" class="space-y-2">
            <label for="signup-city" class="text-sm font-medium">City</label>
            <input
              id="signup-city"
              v-model="form.city"
              type="text"
              placeholder="Berlin, Munich..."
              class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
          </div>

          <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

          <Button type="submit" class="w-full" :disabled="loading">
            {{ loading ? 'Sending...' : 'Send magic link' }}
          </Button>
        </form>
      </template>

      <!-- Step 2: Check your email -->
      <template v-else-if="step === 'check-email'">
        <DialogHeader>
          <DialogTitle>Check your email</DialogTitle>
        </DialogHeader>
        <div class="space-y-4 py-4 text-center">
          <div class="text-4xl">✉️</div>
          <p class="text-sm text-muted-foreground">
            We sent a sign-in link to<br>
            <span class="font-medium text-foreground">{{ sentEmail }}</span>
          </p>
          <p class="text-xs text-muted-foreground">
            Click the link in the email to sign in. The link expires in 15 minutes.
          </p>

          <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

          <div class="flex flex-col gap-2 pt-2">
            <Button
              variant="outline"
              :disabled="loading || resendCooldown > 0"
              @click="handleResend"
            >
              {{ resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend email' }}
            </Button>
            <button
              type="button"
              class="text-xs text-muted-foreground underline hover:text-foreground"
              @click="useDifferentEmail"
            >
              Use a different email
            </button>
          </div>
        </div>
      </template>
    </DialogContent>
  </Dialog>
</template>
