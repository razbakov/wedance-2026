import { z } from 'zod'
import { eq, and, desc } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'
import { brandLooks, profiles } from '../../database/schema'
import { requireMember } from './business'
import { requireEventManager } from './businessEvents'
import { writeJson } from '../../utils/flyer/gemini'
import { DIRECTIONS, styleIdeasPrompt } from '../../../shared/utils/flyer'

/**
 * Business mode — a profile's flyer styles (brand_looks): the looks its flyers
 * are painted in. "Yours" are read off its own flyers or kept from a painting;
 * "ideas" (source 'generated') are suggestions Gemini wrote for it, painted
 * only when picked. The description is the prompt the look is painted from,
 * editable as text.
 */
const palette = z.array(z.object({ name: z.string().trim().max(40), hex: z.string().regex(/^#[0-9a-fA-F]{6}$/) })).max(8)
const fields = { name: z.string().trim().min(1).max(60), description: z.string().trim().min(10, 'Describe the look in a sentence or two.').max(4000), palette }

const shape = (l: any) => ({
  id: l.id, name: l.name, description: l.description, palette: l.palette ?? [], references: l.references ?? [],
  source: (l.source ?? 'flyers') as string, idea: l.source === 'generated', updatedAt: l.updatedAt,
})

async function lookForMember(ctx: any, id: string) {
  const [l] = await ctx.db.select().from(brandLooks).where(eq(brandLooks.id, id))
  if (!l) throw new TRPCError({ code: 'NOT_FOUND', message: 'That style is gone.' })
  const [p] = await ctx.db.select({ username: profiles.username }).from(profiles).where(eq(profiles.id, l.profileId))
  await requireMember(ctx, p!.username)
  return l
}

/** The profile whose styles these are: by handle (its Styles page) or by an event it runs (the flyer page). */
async function profileFor(ctx: any, input: { username?: string; eventId?: string }) {
  if (input.username) return requireMember(ctx, input.username)
  if (input.eventId) {
    const ev = await requireEventManager(ctx, input.eventId)
    const [p] = await ctx.db.select().from(profiles).where(eq(profiles.id, ev.hostProfileId))
    if (!p) throw new TRPCError({ code: 'BAD_REQUEST', message: 'This event has no host profile.' })
    return p
  }
  throw new TRPCError({ code: 'BAD_REQUEST', message: 'Say whose styles.' })
}
const who = z.object({ username: z.string().min(1).optional(), eventId: z.string().uuid().optional() })

export const businessLooksRouter = router({
  list: protectedProcedure
    .input(who)
    .query(async ({ ctx, input }) => {
      const p = await profileFor(ctx, input)
      const rows = await ctx.db.select().from(brandLooks).where(eq(brandLooks.profileId, p.id)).orderBy(desc(brandLooks.updatedAt))
      return { profile: { username: p.username, name: p.name }, looks: rows.map(shape), builtIn: DIRECTIONS.map(d => ({ name: d.name!, hint: d.hint, description: d.description })) }
    }),

  create: protectedProcedure
    .input(who.extend(fields).extend({ source: z.enum(['manual', 'generated']).default('manual') }))
    .mutation(async ({ ctx, input }) => {
      const p = await profileFor(ctx, input)
      const [l] = await ctx.db.insert(brandLooks).values({ profileId: p.id, name: input.name, description: input.description, palette: input.palette, source: input.source, createdBy: ctx.dancerId }).returning()
      return shape(l)
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid(), name: fields.name.optional(), description: fields.description.optional(), palette: palette.optional(), keep: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      const l = await lookForMember(ctx, input.id)
      const { id, keep, ...set } = input
      // "Keep" an idea: it becomes one of the profile's own styles.
      await ctx.db.update(brandLooks).set({ ...set, ...(keep && l.source === 'generated' ? { source: 'manual' } : {}), updatedAt: new Date() }).where(eq(brandLooks.id, id))
      return { saved: true }
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await lookForMember(ctx, input.id)
      // Flyers painted in it keep their own copy of the look (event_flyers.look).
      await ctx.db.delete(brandLooks).where(eq(brandLooks.id, input.id))
      return { removed: true }
    }),

  // New style ideas for the profile, written by Gemini (text only: nothing is painted).
  generate: protectedProcedure
    .input(who.extend({ count: z.number().int().min(1).max(8).default(4), feelings: z.array(z.string().trim().max(30)).max(5).default([]) }))
    .mutation(async ({ ctx, input }) => {
      const p = await profileFor(ctx, input)
      const have = await ctx.db.select({ name: brandLooks.name }).from(brandLooks).where(eq(brandLooks.profileId, p.id))
      const prompt = styleIdeasPrompt({
        name: p.name, styles: (p.styles ?? []) as string[], city: p.city, feelings: input.feelings, count: input.count,
        existing: [...have.map((h: any) => h.name), ...DIRECTIONS.map(d => d.name!)],
      })
      let r: { styles?: { name?: string; hint?: string; description?: string; palette?: { name: string; hex: string }[] }[] }
      try { r = await writeJson(prompt) } catch (e: any) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: e?.message || 'Couldn’t come up with styles. Try again.' })
      }
      const ideas = (r.styles ?? []).filter(x => x?.name && (x.description ?? '').length >= 20).slice(0, input.count)
      if (!ideas.length) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'No usable styles came back. Try again.' })
      const rows = await ctx.db.insert(brandLooks).values(ideas.map(x => ({
        profileId: p.id, name: String(x.name).slice(0, 60), description: String(x.description).slice(0, 4000),
        palette: (x.palette ?? []).filter(c => /^#[0-9a-fA-F]{6}$/.test(c?.hex ?? '')).slice(0, 6), source: 'generated', createdBy: ctx.dancerId,
      }))).returning()
      return rows.map(shape)
    }),
})
