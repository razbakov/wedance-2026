/**
 * ChatGPT's connector refuses a tool list whose definitions (name, title,
 * description, input schema) together exceed 16,000 tokens, and it drops
 * whatever doesn't fit — including create_event, update_event and
 * publish_event (RAZ-1081). Claude and Cursor load the full catalogue.
 *
 * cl100k measures this catalogue at about 3.75 characters per token
 * (2026-11-23), so 56,000 characters stays under 16,000 tokens. One tool
 * must also stay under 5,000 tokens; 18,000 characters is that cap.
 */
import { z } from 'zod'
import { toJsonSchemaCompat } from '@modelcontextprotocol/sdk/server/zod-json-schema-compat.js'
import type { ToolDef } from './tools'

export const CHATGPT_SCHEMA_CHAR_BUDGET = 56_000
export const CHATGPT_TOOL_CHAR_BUDGET = 18_000

/**
 * Tools an organiser or dancer is promised in ChatGPT, considered first so a
 * later fat schema can't push event management out of the budget.
 * Anything the caller isn't allowed to see is skipped. Leftover room is
 * filled with the rest of their tools, smallest gaps included.
 */
const CHATGPT_FIRST = [
  'create_event', 'update_event', 'publish_event',
  'import_from_instagram', 'my_profiles', 'my_events', 'get_my_event', 'inbox', 'create_my_page',
  'add_venue', 'find_lineup', 'add_profile_from_instagram', 'suggest_venues', 'update_listed_profile',
  'duplicate_event', 'archive_event', 'cancel_event', 'invite_artist',
  'flyer_options', 'make_flyer', 'flyer_status', 'flyer_variants', 'fix_flyer', 'write_captions', 'plan_posts',
  'find_events', 'get_event', 'find_festivals', 'get_festival', 'get_profile', 'list_venues', 'list_artists', 'whos_going',
  'me', 'my_plan', 'add_to_plan', 'remove_from_plan', 'my_tickets', 'buy_ticket', 'report_bug',
] as const

const charsOf = new WeakMap<ToolDef, number>()

/** Characters of the tool definition ChatGPT stores. */
export function toolDefinitionChars(tool: ToolDef): number {
  const hit = charsOf.get(tool)
  if (hit != null) return hit
  const n = JSON.stringify({
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: toJsonSchemaCompat(z.object(tool.input), { strictUnions: true, pipeStrategy: 'input' }),
    annotations: { title: tool.title, ...tool.annotations },
    execution: { taskSupport: 'forbidden' },
  }).length
  charsOf.set(tool, n)
  return n
}

/** The subset of `allowed` that fits ChatGPT's schema budget, in the same order. */
export function fitChatgptTools(allowed: readonly ToolDef[]): ToolDef[] {
  const cost = new Map(allowed.map(t => [t.name, toolDefinitionChars(t)]))
  const keep = new Set<string>()
  let used = 0
  const consider = (name: string) => {
    if (keep.has(name)) return
    const c = cost.get(name)
    if (c == null || c > CHATGPT_TOOL_CHAR_BUDGET) return
    if (used + c > CHATGPT_SCHEMA_CHAR_BUDGET) return
    keep.add(name)
    used += c
  }
  for (const name of CHATGPT_FIRST) consider(name)
  for (const t of allowed) consider(t.name)
  return allowed.filter(t => keep.has(t.name))
}
