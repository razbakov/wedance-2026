/**
 * WeDance's official Meta app (#501) — "WeDance", business portfolio WeDance.
 *
 * Instagram API with Unified login: new Meta apps no longer get the plain
 * "Instagram Login" setup; organisers sign in through a Facebook Login for
 * Business configuration (config_id, never `scope`) and WeDance gets a
 * system-user token that never expires, with their Instagram account as the
 * asset. Developer dashboard: developers.facebook.com/apps/2207322860205270.
 *
 * Env (Vercel):
 *   META_APP_SECRET            — App settings → Basic → App secret (required)
 *   META_WEBHOOK_VERIFY_TOKEN  — any random string; the same one goes in the dashboard's webhook form
 *   META_APP_ID / META_INSTAGRAM_CONFIG_ID / META_GRAPH_VERSION — defaults below
 */
export const META_DEFAULTS = {
  appId: '2207322860205270',
  // Facebook Login for Business → Configurations → "Connect Instagram": system-user token
  // (never expires), asset Instagram account (required), instagram_basic,
  // instagram_content_publish, instagram_manage_comments, instagram_manage_messages,
  // business_management (without it /me/assigned_instagram_accounts comes back empty).
  instagramConfigId: '1134955742345614',
  graphVersion: 'v25.0',
} as const

export const INSTAGRAM_SCOPES = [
  'instagram_basic',
  'instagram_content_publish',
  'instagram_manage_comments',
  'instagram_manage_messages',
  'business_management',
] as const

export interface MetaConfig {
  appId: string
  appSecret: string
  instagramConfigId: string
  graphVersion: string
  webhookVerifyToken: string
}

export function metaConfig(env: Record<string, string | undefined> = process.env): MetaConfig {
  return {
    appId: env.META_APP_ID || META_DEFAULTS.appId,
    appSecret: env.META_APP_SECRET || '',
    instagramConfigId: env.META_INSTAGRAM_CONFIG_ID || META_DEFAULTS.instagramConfigId,
    graphVersion: env.META_GRAPH_VERSION || META_DEFAULTS.graphVersion,
    webhookVerifyToken: env.META_WEBHOOK_VERIFY_TOKEN || '',
  }
}

/** Connecting needs the app secret (code exchange); everything else follows from it. */
export function instagramConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return !!metaConfig(env).appSecret
}

/** The redirect registered in the dashboard (Unified login setup → Redirect URL). */
export function instagramRedirectUri(siteUrl: string): string {
  return `${siteUrl.replace(/\/$/, '')}/api/meta/instagram/callback`
}
