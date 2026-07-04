<script setup lang="ts">
/**
 * Email + password auth modal, styled in the 2026 V3 tropical aesthetic
 * (Playfair Display / Caveat, #fbf5ea / #3b1f0d / #dc2626). Two modes: Login
 * (email + password) and Register (name + email + password only).
 *
 * Register is intentionally near-instant: it collects ONLY name, email, and
 * password. Dance styles / role / city are NOT asked here — they belong to a
 * later onboarding step. The register tRPC procedure keeps those params
 * optional, so callers that already collected them via their own onboarding
 * (e.g. the festival page) may still pass them through `prefill`; the modal
 * forwards prefilled values but never renders inputs for them.
 */
const props = defineProps<{
  open: boolean
  action: string
  prefill?: { name?: string; danceStyles?: string[]; role?: 'lead' | 'follow' | 'both'; city?: string }
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { login, register } = useAuth()

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

type Mode = 'login' | 'register'

// signin action → start in login mode; every other action is a "join" prompt →
// start in register mode. The user can flip either way via the toggle.
const mode = ref<Mode>('login')
const isRegister = computed(() => mode.value === 'register')

const form = reactive({
  name: '',
  email: '',
  password: '',
})

const error = ref('')
const loading = ref(false)
const showPassword = ref(false)

// Track whether the name was pre-filled from onboarding — hide it in the form.
const hasPrefillName = ref(false)

function resetForm() {
  form.name = ''
  form.email = ''
  form.password = ''
  error.value = ''
  showPassword.value = false
  hasPrefillName.value = false
}

function applyPrefill() {
  if (!props.prefill) return
  if (props.prefill.name) { form.name = props.prefill.name; hasPrefillName.value = true }
}

watch(() => props.open, (open) => {
  if (!open) {
    resetForm()
  } else {
    // signin → login; any "join" action → register.
    mode.value = props.action === 'signin' ? 'login' : 'register'
    applyPrefill()
  }
})

function switchMode(next: Mode) {
  mode.value = next
  error.value = ''
}

async function handleSubmit() {
  error.value = ''

  const email = form.email.trim()
  if (!email) {
    error.value = 'Email is required.'
    return
  }
  if (!form.password) {
    error.value = 'Password is required.'
    return
  }

  if (isRegister.value) {
    if (!hasPrefillName.value && !form.name.trim()) {
      error.value = 'Name is required.'
      return
    }
    if (form.password.length < 8) {
      error.value = 'Password must be at least 8 characters.'
      return
    }
  }

  loading.value = true
  try {
    if (isRegister.value) {
      // Fast register: name + email + password only. Dance styles / role /
      // city are forwarded ONLY when a caller pre-filled them from its own
      // onboarding — the modal never collects them itself.
      await register({
        name: form.name.trim() || props.prefill?.name || '',
        email,
        password: form.password,
        danceStyles: props.prefill?.danceStyles ?? [],
        role: props.prefill?.role,
        city: props.prefill?.city,
      })
    } else {
      await login({ email, password: form.password })
    }
    emit('update:open', false)
  } catch (e: any) {
    error.value = e?.message || 'Something went wrong. Please try again.'
  } finally {
    loading.value = false
  }
}

// Shared input styling — matches the rounded, warm inputs on /cities.
const inputClass = 'w-full h-11 rounded-full px-4 text-sm outline-none transition-all'
const inputStyle = 'background:white; border:1px solid #3b1f0d33; color:#3b1f0d; font-family: system-ui, sans-serif;'
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent
      class="sm:max-w-md border-0 p-0 overflow-hidden"
      style="background:#fbf5ea; color:#3b1f0d; font-family:'Playfair Display', serif;"
    >
      <!-- Accent bar -->
      <div class="h-1.5" style="background:#dc2626;" />

      <div class="px-6 pb-6 pt-4">
        <DialogHeader class="text-left space-y-1">
          <div class="text-[10px] uppercase tracking-[0.3em] font-bold" style="color:#9a5614;">
            {{ isRegister ? 'Join the floor' : 'Welcome back' }}
          </div>
          <DialogTitle class="text-2xl leading-tight" style="color:#3b1f0d; font-family:'Playfair Display', serif;">
            {{ isRegister ? (headlines[action] || 'Join WeDance') : 'Sign in to WeDance' }}
          </DialogTitle>
          <DialogDescription style="color:#5b3a1d; font-family: system-ui, sans-serif;">
            {{ isRegister ? 'Create your account with email and password.' : 'Enter your email and password.' }}
          </DialogDescription>
        </DialogHeader>

        <form class="space-y-4 pt-4" @submit.prevent="handleSubmit">
          <!-- Name (register only, unless prefilled) -->
          <div v-if="isRegister && !hasPrefillName" class="space-y-1.5">
            <label for="auth-name" class="text-sm font-bold" style="color:#3b1f0d;">Name</label>
            <input
              id="auth-name"
              v-model="form.name"
              type="text"
              placeholder="Your name"
              autocomplete="name"
              :class="inputClass"
              :style="inputStyle"
            >
          </div>

          <!-- Email -->
          <div class="space-y-1.5">
            <label for="auth-email" class="text-sm font-bold" style="color:#3b1f0d;">Email</label>
            <input
              id="auth-email"
              v-model="form.email"
              type="email"
              placeholder="you@example.com"
              autocomplete="email"
              required
              :class="inputClass"
              :style="inputStyle"
            >
          </div>

          <!-- Password -->
          <div class="space-y-1.5">
            <label for="auth-password" class="text-sm font-bold" style="color:#3b1f0d;">Password</label>
            <div class="relative">
              <input
                id="auth-password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                :placeholder="isRegister ? 'At least 8 characters' : 'Your password'"
                :autocomplete="isRegister ? 'new-password' : 'current-password'"
                required
                :class="inputClass + ' pr-16'"
                :style="inputStyle"
              >
              <button
                type="button"
                class="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold uppercase tracking-wider"
                style="color:#9a5614; font-family: system-ui, sans-serif;"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? 'Hide' : 'Show' }}
              </button>
            </div>
          </div>

          <p v-if="error" class="text-sm font-bold" style="color:#dc2626; font-family: system-ui, sans-serif;">
            {{ error }}
          </p>

          <button
            type="submit"
            :disabled="loading"
            class="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-white text-sm font-bold uppercase tracking-wider disabled:opacity-60"
            style="background:#dc2626; box-shadow: 0 3px 0 -1px #b91c1c; font-family: system-ui, sans-serif;"
          >
            {{ loading
              ? (isRegister ? 'Creating account…' : 'Signing in…')
              : (isRegister ? 'Create account' : 'Sign in') }}
          </button>

          <!-- Mode toggle -->
          <p class="text-center text-sm pt-1" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
            <template v-if="isRegister">
              Already have an account?
              <button type="button" class="font-bold underline" style="color:#dc2626;" @click="switchMode('login')">
                Sign in
              </button>
            </template>
            <template v-else>
              New to WeDance?
              <button type="button" class="font-bold underline" style="color:#dc2626;" @click="switchMode('register')">
                Create an account
              </button>
            </template>
          </p>
        </form>
      </div>
    </DialogContent>
  </Dialog>
</template>
