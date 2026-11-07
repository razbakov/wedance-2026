/**
 * Flatten a Meta webhook body (object: "instagram") into one row per change
 * or message (#501). `entry[].id` is the Instagram account; `changes[]` carry
 * comments / mentions, `messaging[]` carries direct messages.
 */
export interface WebhookRow { igUserId: string; field: string; payload: Record<string, unknown> }

export function webhookRows(body: any): WebhookRow[] {
  if (!body || body.object !== 'instagram' || !Array.isArray(body.entry)) return []
  const out: WebhookRow[] = []
  for (const e of body.entry) {
    const id = e?.id != null ? String(e.id) : ''
    if (!id) continue
    for (const c of Array.isArray(e.changes) ? e.changes : []) {
      if (c?.field) out.push({ igUserId: id, field: String(c.field), payload: { ...(c.value ?? {}), time: e.time ?? null } })
    }
    for (const m of Array.isArray(e.messaging) ? e.messaging : []) {
      out.push({ igUserId: id, field: 'messages', payload: m ?? {} })
    }
  }
  return out.slice(0, 200)
}
