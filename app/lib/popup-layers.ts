/**
 * Layering above popups (RAZ-992). The "Talk to us" button and the report form
 * must work while another popup is open, so a bug inside that popup can be
 * reported (and screenshotted) without closing it.
 *
 * - Elements marked with KEEP_POPUPS_OPEN don't count as "outside" for our
 *   reka-ui dialogs: clicking them doesn't close the open popup
 *   (`keepPopupsOpen`, wired into ui/dialog DialogContent + DialogScrollContent).
 * - The trigger and the report form use `z-[120]`, above every popup layer in
 *   the app (dialogs z-50, hand-made sheets up to z-[80], the photo lightbox
 *   z-[100]). Written out literally in ReportProblem.vue so Tailwind sees it.
 */
export const KEEP_POPUPS_OPEN = 'data-keep-popups-open'

/** True when an outside pointer/focus event came from an element that must not close popups. */
export function isKeepOpenTarget(target: EventTarget | null | undefined): boolean {
  const el = target as Element | null | undefined
  return !!el && typeof el.closest === 'function' && !!el.closest(`[${KEEP_POPUPS_OPEN}]`)
}

/** Handler for reka-ui's `interact-outside`: ignore clicks/focus on KEEP_POPUPS_OPEN elements. */
export function keepPopupsOpen(event: CustomEvent<{ originalEvent: Event }>) {
  if (isKeepOpenTarget(event.detail?.originalEvent?.target)) event.preventDefault()
}
