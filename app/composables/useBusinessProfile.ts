/**
 * The profile the /business sidebar switcher is set to ('' = all profiles I manage).
 * A cookie so the choice survives reloads and is the same on every /business page.
 */
export function useBusinessProfile() {
  return useCookie<string>('wd-business-profile', { default: () => '', sameSite: 'lax', maxAge: 60 * 60 * 24 * 180 })
}

/** Bumped when the profiles I manage change outside the layout (a page deleted), so the switcher re-reads them. */
export function useBusinessProfilesVersion() {
  return useState<number>('business-profiles-version', () => 0)
}
