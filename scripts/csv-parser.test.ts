/**
 * Tests for CSV parser
 */
import { describe, it, expect } from 'vitest'
import { parseCSVLine } from './csv-parser'

describe('parseCSVLine', () => {
  it('parses simple comma-separated values', () => {
    const line = 'munich,Salsa Munich,whatsapp,https://chat.whatsapp.com/abc123,salsa|bachata,local-organizer,true'
    const result = parseCSVLine(line)
    expect(result).toEqual([
      'munich',
      'Salsa Munich',
      'whatsapp',
      'https://chat.whatsapp.com/abc123',
      'salsa|bachata',
      'local-organizer',
      'true',
    ])
  })

  it('handles quoted fields containing commas', () => {
    const line = 'munich,"Salsa, Bachata & Kizomba Munich",whatsapp,https://chat.whatsapp.com/abc'
    const result = parseCSVLine(line)
    expect(result).toEqual([
      'munich',
      'Salsa, Bachata & Kizomba Munich',
      'whatsapp',
      'https://chat.whatsapp.com/abc',
    ])
  })

  it('handles escaped quotes inside quoted fields', () => {
    const line = 'munich,"Group ""The Best"" Ever",whatsapp,https://t.me/example'
    const result = parseCSVLine(line)
    expect(result).toEqual([
      'munich',
      'Group "The Best" Ever',
      'whatsapp',
      'https://t.me/example',
    ])
  })

  it('handles empty fields', () => {
    const line = 'munich,Name,whatsapp,https://example.com,,'
    const result = parseCSVLine(line)
    expect(result).toEqual(['munich', 'Name', 'whatsapp', 'https://example.com', '', ''])
  })

  it('handles fields with leading/trailing whitespace', () => {
    const line = '  munich  , Salsa Munich , whatsapp , https://chat.whatsapp.com/abc  '
    const result = parseCSVLine(line)
    expect(result).toEqual([
      'munich',
      'Salsa Munich',
      'whatsapp',
      'https://chat.whatsapp.com/abc',
    ])
  })

  it('handles quoted empty fields', () => {
    const line = 'munich,Name,whatsapp,https://example.com,"",other'
    const result = parseCSVLine(line)
    expect(result).toEqual(['munich', 'Name', 'whatsapp', 'https://example.com', '', 'other'])
  })

  it('handles a single field', () => {
    const line = 'just-one-field'
    const result = parseCSVLine(line)
    expect(result).toEqual(['just-one-field'])
  })

  it('handles quoted field at the beginning', () => {
    const line = '"quoted, field",next,field'
    const result = parseCSVLine(line)
    expect(result).toEqual(['quoted, field', 'next', 'field'])
  })
})
