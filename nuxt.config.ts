import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  app: {
    head: {
      link: [
        // WeDance flame mark, tinted V3 red (#dc2626 — same red as
        // "night" in the homepage H1). Modern browsers use the SVG;
        // older browsers + Windows fall back to the multi-size .ico;
        // iOS home-screen uses the 180x180 PNG.
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'alternate icon', href: '/favicon.ico', sizes: '16x16 32x32 48x48 64x64' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      ],
    },
  },
  nitro: {
    preset: 'vercel',
  },
  modules: ['shadcn-nuxt'],
  shadcn: {
    prefix: '',
    componentDir: './app/components/ui',
  },
  css: ['./app/assets/css/tailwind.css'],
  vite: {
    plugins: [tailwindcss()],
  },
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || '',
    resendApiKey: process.env.RESEND_API_KEY || '',
    resendFromEmail: process.env.RESEND_FROM_EMAIL || 'WeDance <noreply@wedance.vip>',
    // Canonical, user-facing base URL for links in emails (magic link / reset).
    // Precedence: explicit SITE_URL → production always uses the custom domain
    // (never VERCEL_URL, which is the per-deployment hostname and leaks ugly
    // *.vercel.app links) → preview deploys use their VERCEL_URL → local dev.
    siteUrl:
      process.env.SITE_URL
      || (process.env.VERCEL_ENV === 'production'
        ? 'https://2026.wedance.vip'
        : process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3000'),
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    tickettailorWebhookSecret: process.env.TICKETTAILOR_WEBHOOK_SECRET || '',
    public: {
      // PostHog product analytics. Empty key => tracking is a no-op (safe to
      // ship un-keyed). Set NUXT_PUBLIC_POSTHOG_KEY (phc_…) to turn it on.
      posthogKey: process.env.NUXT_PUBLIC_POSTHOG_KEY || '',
      posthogHost: process.env.NUXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
    },
  },
})
