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
    siteUrl: process.env.SITE_URL || 'http://localhost:3000',
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    tickettailorWebhookSecret: process.env.TICKETTAILOR_WEBHOOK_SECRET || '',
  },
})
