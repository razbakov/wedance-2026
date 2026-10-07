<script setup lang="ts">
/**
 * Email + password auth modal, styled in the 2026 V3 tropical aesthetic
 * (Playfair Display / Caveat, #fbf5ea / #3b1f0d / #dc2626). Modes: Login
 * (email + password), Register (name + email + password only), and Recovery
 * (magic-link "forgot password").
 *
 * Register is intentionally near-instant: it collects ONLY name, email, and
 * password. Dance styles / role / city are NOT asked here — they belong to a
 * later onboarding step. The register tRPC procedure keeps those params
 * optional, so callers that already collected them via their own onboarding
 * (e.g. the festival page) may still pass them through `prefill`; the modal
 * forwards prefilled values but never renders inputs for them.
 *
 * Recovery ("Forgot password?") reuses the existing magic-link plumbing: it
 * calls auth.requestMagicLink with purpose='recovery'; the emailed link points
 * to /auth/verify?token=…&mode=reset which shows a "set new password" form.
 * requestMagicLink shows the same "check your email" confirmation whether or
 * not the address is registered, so the recovery view never reveals which
 * emails exist.
 */
import { LoginSchema, RecoverySchema, RegisterSchema } from '#shared/validation'

const props = defineProps<{
  open: boolean
  action: string
  prefill?: { name?: string; danceStyles?: string[]; role?: 'lead' | 'follow' | 'both'; city?: string }
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { login, register, requestMagicLink } = useAuth()

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

type Mode = 'login' | 'register' | 'recovery'

// signin action → start in login mode; every other action is a "join" prompt →
// start in register mode. The user can flip to recovery via "Forgot password?".
const mode = ref<Mode>('login')
const isRegister = computed(() => mode.value === 'register')
const isRecovery = computed(() => mode.value === 'recovery')

const form = reactive({
  name: '',
  email: '',
  password: '',
})

const error = ref('')
const loading = ref(false)
const showPassword = ref(false)

// Recovery sub-state: after a successful requestMagicLink we show a
// "check your email" confirmation instead of the email input.
const recoverySent = ref(false)

// Track whether the name was pre-filled from onboarding — hide it in the form.
const hasPrefillName = ref(false)

// Refs for focus management (accessibility).
const emailInput = ref<HTMLInputElement | null>(null)
const recoveryEmailInput = ref<HTMLInputElement | null>(null)

// Login and register share the inputs above; `authForm` is whichever is showing.
// A prefilled name has no visible input, so register falls back to it.
const loginForm = reactive(useFormValidation(LoginSchema, form))
const registerForm = reactive(useFormValidation(RegisterSchema, () => ({
  ...form,
  name: form.name.trim() || props.prefill?.name || '',
})))
const authForm = computed(() => (isRegister.value ? registerForm : loginForm))
const recoveryForm = reactive(useFormValidation(RecoverySchema, form))

function resetValidation() {
  loginForm.reset()
  registerForm.reset()
  recoveryForm.reset()
}

function resetForm() {
  form.name = ''
  form.email = ''
  form.password = ''
  error.value = ''
  showPassword.value = false
  recoverySent.value = false
  hasPrefillName.value = false
  resetValidation()
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
  recoverySent.value = false
  resetValidation()
}

function openRecovery() {
  switchMode('recovery')
  // Move focus to the recovery email input once it renders.
  nextTick(() => recoveryEmailInput.value?.focus())
}

function backToLogin() {
  switchMode('login')
  nextTick(() => emailInput.value?.focus())
}

async function handleSubmit() {
  error.value = ''

  if (isRegister.value) {
    const result = registerForm.validate()
    if (!result.success) return
    await submitWith(async () => {
      // Fast register: name + email + password only. Dance styles / role /
      // city are forwarded ONLY when a caller pre-filled them from its own
      // onboarding — the modal never collects them itself.
      await register({
        ...result.data,
        danceStyles: props.prefill?.danceStyles ?? [],
        role: props.prefill?.role,
        city: props.prefill?.city,
      })
      emit('update:open', false)
      // New users go to onboarding (the intent picker). Existing users (login)
      // never do.
      await navigateTo('/onboarding')
    })
  } else {
    const result = loginForm.validate()
    if (!result.success) return
    await submitWith(async () => {
      await login(result.data)
      emit('update:open', false)
    })
  }
}

async function submitWith(action: () => Promise<void>) {
  loading.value = true
  try {
    await action()
  } catch (e: any) {
    error.value = e?.message || 'Something went wrong. Please try again.'
  } finally {
    loading.value = false
  }
}

async function handleRecovery() {
  error.value = ''

  const result = recoveryForm.validate()
  if (!result.success) return

  loading.value = true
  try {
    // Send a password-reset magic link. requestMagicLink returns the same
    // result whether or not the email exists → no user enumeration.
    await requestMagicLink({ ...result.data, purpose: 'recovery' })
    recoverySent.value = true
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
        <!-- ============================ RECOVERY ============================ -->
        <template v-if="isRecovery">
          <DialogHeader class="text-left space-y-1">
            <div class="text-[10px] uppercase tracking-[0.3em] font-bold" style="color:#9a5614;">
              Account recovery
            </div>
            <DialogTitle class="text-2xl leading-tight" style="color:#3b1f0d; font-family:'Playfair Display', serif;">
              {{ recoverySent ? 'Check your email' : 'Forgot your password?' }}
            </DialogTitle>
            <DialogDescription style="color:#5b3a1d; font-family: system-ui, sans-serif;">
              {{ recoverySent
                ? 'We sent you a password reset link. Click it to set a new password.'
                : 'Enter your email and we\'ll send you a link to reset your password.' }}
            </DialogDescription>
          </DialogHeader>

          <!-- Recovery form -->
          <form v-if="!recoverySent" class="space-y-4 pt-4" novalidate @submit.prevent="handleRecovery">
            <div class="space-y-1.5">
              <label for="recovery-email" class="text-sm font-bold" style="color:#3b1f0d;">Email</label>
              <input
                id="recovery-email"
                ref="recoveryEmailInput"
                v-model="form.email"
                type="email"
                placeholder="you@example.com"
                autocomplete="email"
                required
                :class="inputClass"
                :style="inputStyle"
                v-bind="recoveryForm.fieldAttrs('email', 'recovery-email-error')"
              >
              <FieldError id="recovery-email-error" :message="recoveryForm.errors.email" />
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
              {{ loading ? 'Sending…' : 'Send me a reset link' }}
            </button>

            <p class="text-center text-sm pt-1" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
              <button type="button" class="font-bold underline" style="color:#dc2626;" @click="backToLogin">
                Back to login
              </button>
            </p>
          </form>

          <!-- Recovery confirmation -->
          <div v-else class="space-y-4 pt-4">
            <div
              class="rounded-2xl px-4 py-4 text-sm"
              style="background:white; border:1px solid #16a34a55; color:#3b1f0d; font-family: system-ui, sans-serif;"
            >
              If <span class="font-bold">{{ form.email.trim() }}</span> has an account, a password reset link is on its way.
              The link expires in 15 minutes.
            </div>
            <p class="text-center text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
              <button type="button" class="font-bold underline" style="color:#dc2626;" @click="backToLogin">
                Back to login
              </button>
            </p>
          </div>
        </template>

        <!-- ======================= LOGIN / REGISTER ======================= -->
        <template v-else>
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

          <form class="space-y-4 pt-4" novalidate @submit.prevent="handleSubmit">
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
                v-bind="authForm.fieldAttrs('name', 'auth-name-error')"
              >
              <FieldError id="auth-name-error" :message="authForm.errors.name" />
            </div>

            <!-- Email -->
            <div class="space-y-1.5">
              <label for="auth-email" class="text-sm font-bold" style="color:#3b1f0d;">Email</label>
              <input
                id="auth-email"
                ref="emailInput"
                v-model="form.email"
                type="email"
                placeholder="you@example.com"
                autocomplete="email"
                required
                :class="inputClass"
                :style="inputStyle"
                v-bind="authForm.fieldAttrs('email', 'auth-email-error')"
              >
              <FieldError id="auth-email-error" :message="authForm.errors.email" />
            </div>

            <!-- Password -->
            <div class="space-y-1.5">
              <div class="flex items-center justify-between">
                <label for="auth-password" class="text-sm font-bold" style="color:#3b1f0d;">Password</label>
                <button
                  v-if="!isRegister"
                  type="button"
                  class="text-xs font-bold underline"
                  style="color:#dc2626; font-family: system-ui, sans-serif;"
                  @click="openRecovery"
                >
                  Forgot password?
                </button>
              </div>
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
                  v-bind="authForm.fieldAttrs('password', 'auth-password-error')"
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
              <FieldError id="auth-password-error" :message="authForm.errors.password" />
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
        </template>
      </div>
    </DialogContent>
  </Dialog>
</template>
