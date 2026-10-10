<script setup lang="ts">
/**
 * "Report a problem" widget — a site-wide floating button that lets any visitor
 * (signed in or not) file a bug. On click it snapshots the *current* page with
 * html2canvas (before the dialog opens, so the report shows what the user was
 * actually looking at), then opens a dialog for a short description + optional
 * email. Submitting calls the `feedback.report` tRPC mutation, which files a
 * Linear issue in team WED with the screenshot + a rich context bundle
 * (device, route, recent client errors, Sentry replay link — see
 * useReportContext). Styled in the 2026 tropical aesthetic to match SignUpModal.
 */
import { Bug, X, Check, Loader2, ImageIcon } from 'lucide-vue-next'
import { ReportProblemSchema } from '#shared/validation'

const { collect } = useReportContext()
const { isSignedIn } = useAuth()
const { track } = useTrack()
const { $trpc } = useNuxtApp()

const open = ref(false)
const description = ref('')
const email = ref('')
const screenshot = ref<string | null>(null)
const capturing = ref(false)
const submitting = ref(false)
const error = ref('')
const doneUrl = ref<string | null>(null)
const { errors, validate, reset: resetValidation, fieldAttrs } = useFormValidation(ReportProblemSchema, () => ({
  description: description.value,
  email: email.value,
}))

async function captureScreenshot(): Promise<string | null> {
  if (!import.meta.client) return null
  try {
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(document.body, {
      logging: false,
      useCORS: true,
      backgroundColor: '#ffffff',
      imageTimeout: 5000,
      scale: Math.min(window.devicePixelRatio || 1, 1.5),
      x: window.scrollX,
      y: window.scrollY,
      width: window.innerWidth,
      height: window.innerHeight,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
      onclone: (doc: Document, cloned: HTMLElement) => {
        // html2canvas v1.4.1 only understands rgb/rgba/hsl/hsla.
        // Tailwind 4 emits oklch() in CSS variables and color-mix()
        // for opacity utilities — both crash the color parser before
        // any element is rendered.  Inject hex overrides for every
        // CSS variable so computed styles resolve to safe values.
        const fix = doc.createElement('style')
        fix.textContent = [
          ':root{',
          '--background:#fbf5ea;--foreground:#3b1f0d;',
          '--card:#ffffff;--card-foreground:#3b1f0d;',
          '--popover:#ffffff;--popover-foreground:#3b1f0d;',
          '--primary:#dc2626;--primary-foreground:#ffffff;',
          '--secondary:#9a5614;--secondary-foreground:#fbf5ea;',
          '--muted:#f5efe5;--muted-foreground:#5b3a1d;',
          '--accent:#f7efe0;--accent-foreground:#9a5614;',
          '--destructive:#dc2626;--destructive-foreground:#ffffff;',
          '--border:rgba(59,31,13,0.13);--input:rgba(59,31,13,0.2);--ring:#9a5614;',
          '--success:#16a34a;--info:#0891b2;--warning:#f59e0b;',
          '}',
        ].join('')
        doc.head.appendChild(fix)

        // Neutralise any remaining CSS Color Level 4 values that
        // html2canvas v1 can't parse (oklch, oklab, lab, lch,
        // color-mix, hwb).  Tailwind 4 and modern browsers emit
        // these in computed styles even when the source uses oklch.
        const colorProps = [
          'color', 'backgroundColor',
          'borderTopColor', 'borderRightColor',
          'borderBottomColor', 'borderLeftColor',
        ] as const
        const unsupported = /oklch|oklab|lab\(|lch\(|color-mix|hwb\(/
        cloned.querySelectorAll<HTMLElement>('*').forEach((el) => {
          const cs = doc.defaultView?.getComputedStyle(el)
          if (!cs) return
          for (const prop of colorProps) {
            if (unsupported.test(cs[prop])) {
              el.style[prop] = 'transparent'
            }
          }
        })

        // Strip SVG-filter overlays and blend modes that html2canvas
        // can't reproduce (grain texture, mix-blend-mode layers).
        cloned.querySelectorAll<HTMLElement>('[style]').forEach((el) => {
          const s = el.style
          const bg = s.backgroundImage || ''
          if (
            /feTurbulence|feBlend|feGaussianBlur/.test(bg)
            || (s.mixBlendMode && s.mixBlendMode !== 'normal')
          ) {
            el.remove()
            return
          }
          if (s.backdropFilter || (s as CSSStyleDeclaration & { webkitBackdropFilter?: string }).webkitBackdropFilter) {
            s.backdropFilter = 'none'
            s.setProperty('-webkit-backdrop-filter', 'none')
          }
        })
        cloned.querySelectorAll('[class*="backdrop-blur"]').forEach((el) => {
          const h = el as HTMLElement
          h.style.backdropFilter = 'none'
          h.style.setProperty('-webkit-backdrop-filter', 'none')
        })
      },
      ignoreElements: (el: Element) => {
        const tag = el.tagName
        return tag === 'IFRAME' || tag === 'VIDEO'
      },
    })
    // JPEG @ 0.8 keeps the data URL small enough for a single request.
    return canvas.toDataURL('image/jpeg', 0.8)
  } catch (e) {
    console.warn('[ReportProblem] screenshot capture failed:', e)
    return null // screenshot is best-effort; report still submits without it
  }
}

async function openReport() {
  error.value = ''
  doneUrl.value = null
  capturing.value = true
  // Snapshot the page as it looks right now, then reveal the dialog.
  screenshot.value = await captureScreenshot()
  capturing.value = false
  open.value = true
  track('problem_report_opened')
}

function reset() {
  description.value = ''
  email.value = ''
  screenshot.value = null
  error.value = ''
  submitting.value = false
  doneUrl.value = null
  resetValidation()
}

watch(open, (v) => {
  if (!v) setTimeout(reset, 200)
})

async function submit() {
  error.value = ''
  const result = validate()
  if (!result.success) return
  submitting.value = true
  try {
    const res = await $trpc.feedback.report.mutate({
      ...result.data,
      context: collect(),
      screenshot: screenshot.value || undefined,
    })
    doneUrl.value = res.url
    track('problem_report_submitted', { identifier: res.identifier })
  } catch (e: any) {
    error.value = e?.message || 'Could not submit. Please try again, or email hello@wedance.vip.'
  } finally {
    submitting.value = false
  }
}

const inputClass = 'w-full rounded-2xl px-4 py-3 text-sm outline-none transition-all bg-white border border-border text-foreground font-sans'
</script>

<template>
  <!-- Floating trigger (bottom-left to stay clear of the plan/cart sidebar) -->
  <button
    type="button"
    :disabled="capturing"
    class="fixed left-4 bottom-4 z-40 inline-flex items-center gap-2 rounded-full pl-3 pr-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg disabled:opacity-70 bg-foreground"
    style="box-shadow: 0 4px 14px rgba(59,31,13,0.35);"
    aria-label="Report a problem"
    @click="openReport"
  >
    <Loader2 v-if="capturing" class="w-4 h-4 animate-spin" />
    <Bug v-else class="w-4 h-4" />
    <span class="hidden sm:inline">{{ capturing ? 'Capturing…' : 'Report a problem' }}</span>
  </button>

  <Dialog v-model:open="open">
    <DialogContent
      class="sm:max-w-md border-0 p-0 overflow-hidden [&>button]:top-6 [&>button]:right-5 bg-background text-foreground font-display"
    >
      <div class="h-1.5 bg-primary" />

      <div class="px-6 pb-6 pt-4">
        <!-- Success -->
        <template v-if="doneUrl">
          <DialogHeader class="text-left space-y-1">
            <div class="text-[10px] uppercase tracking-[0.3em] font-bold text-secondary">Thank you</div>
            <DialogTitle class="text-2xl leading-tight text-foreground font-display">
              Report sent 🎉
            </DialogTitle>
            <DialogDescription class="text-muted-foreground font-sans">
              Our team has it, complete with a screenshot and technical details. We really appreciate you flagging it.
            </DialogDescription>
          </DialogHeader>
          <button
            type="button"
            class="mt-5 w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-white text-sm font-bold uppercase tracking-wider bg-primary shadow-[0_3px_0_-1px_var(--wd-red-800)] font-sans"
            @click="open = false"
          >
            <Check class="w-4 h-4" /> Done
          </button>
        </template>

        <!-- Form -->
        <template v-else>
          <DialogHeader class="text-left space-y-1">
            <div class="text-[10px] uppercase tracking-[0.3em] font-bold text-secondary">Help us improve</div>
            <DialogTitle class="text-2xl leading-tight text-foreground font-display">
              Report a problem
            </DialogTitle>
            <DialogDescription class="text-muted-foreground font-sans">
              Tell us what went wrong. We’ll attach a screenshot of this page and technical details to help us fix it fast.
            </DialogDescription>
          </DialogHeader>

          <form class="space-y-4 pt-4" novalidate @submit.prevent="submit">
            <div class="space-y-1.5">
              <label for="report-desc" class="text-sm font-bold text-foreground">What happened?</label>
              <textarea
                id="report-desc"
                v-model="description"
                rows="4"
                placeholder="e.g. I clicked ‘Save my plan’ and nothing happened…"
                required
                :class="inputClass"
                v-bind="fieldAttrs('description', 'report-desc-error')"
              />
              <FieldError id="report-desc-error" :message="errors.description" />
            </div>

            <div v-if="!isSignedIn" class="space-y-1.5">
              <label for="report-email" class="text-sm font-bold text-foreground">
                Email <span class="text-secondary font-normal">(optional — so we can follow up)</span>
              </label>
              <input
                id="report-email"
                v-model="email"
                type="email"
                placeholder="you@example.com"
                autocomplete="email"
                :class="inputClass"
                v-bind="fieldAttrs('email', 'report-email-error')"
              >
              <FieldError id="report-email-error" :message="errors.email" />
            </div>

            <!-- Screenshot status -->
            <div
              class="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-xs bg-white border border-border text-muted-foreground font-sans"
            >
              <ImageIcon class="w-4 h-4 shrink-0" :class="screenshot ? 'text-success' : 'text-secondary'" />
              <span v-if="screenshot" class="flex-1">Screenshot of this page attached.</span>
              <span v-else class="flex-1">No screenshot captured — we’ll still get your description &amp; details.</span>
              <button
                v-if="screenshot"
                type="button"
                class="font-bold underline shrink-0 text-primary"
                @click="screenshot = null"
              >
                Remove
              </button>
            </div>

            <p v-if="error" class="text-sm font-bold text-primary font-sans">
              {{ error }}
            </p>

            <button
              type="submit"
              :disabled="submitting"
              class="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-white text-sm font-bold uppercase tracking-wider disabled:opacity-60 bg-primary shadow-[0_3px_0_-1px_var(--wd-red-800)] font-sans"
            >
              <Loader2 v-if="submitting" class="w-4 h-4 animate-spin" />
              {{ submitting ? 'Sending…' : 'Send report' }}
            </button>
          </form>
        </template>
      </div>
    </DialogContent>
  </Dialog>
</template>
