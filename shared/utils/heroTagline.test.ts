import { describe, expect, it } from 'vitest'
import { heroTagline } from './heroTagline'

describe('heroTagline', () => {
  it('is empty without a description', () => {
    expect(heroTagline('')).toBe('')
    expect(heroTagline(null)).toBe('')
  })
  it('keeps the first sentence', () => {
    expect(heroTagline('Three days of Kizomba in Dachau. Parties on five floors. Bring shoes.')).toBe('Three days of Kizomba in Dachau.')
  })
  it('does not split on abbreviations or decimals', () => {
    expect(heroTagline('Doors at 20.30 with Salsa and Bachata. More below.')).toBe('Doors at 20.30 with Salsa and Bachata.')
  })
  it('collapses whitespace and returns a short text as is', () => {
    expect(heroTagline('  Salsa night\n\nat the  river ')).toBe('Salsa night at the river')
  })
  it('skips the import notice and source lines of synced events', () => {
    expect(heroTagline('ℹ️ Imported by WeDance from public sources so Munich dancers don’t miss it.\n\nSource: https://mike-dance.de/kursplan/?pno=2')).toBe('')
    expect(heroTagline('ℹ️ Imported by WeDance from public sources.\nSalsa on the terrace every Friday. Free entry.')).toBe('Salsa on the terrace every Friday.')
  })
  it('cuts a long first sentence on a word, with an ellipsis', () => {
    const long = 'The biggest Urban Kiz, Kizomba, Bachata and Salsa weekend in Bavaria with forty international artists, five floors, socials every night, masterclasses on Saturday and a pool party on Sunday afternoon'
    const t = heroTagline(long)
    expect(t.length).toBeLessThanOrEqual(161)
    expect(t.endsWith('…')).toBe(true)
    expect(long.startsWith(t.slice(0, -1))).toBe(true)
  })
})
