import { describe, it, expect } from 'vitest'
import { addCitiesToIndex, mapGroupStyles, mapGroupSheet, matchGroupCity, parseCsv, planGroupImport, groupImportRow } from './communityGroupImport'
import { buildCityIndex } from './v3EventSync'

const idx = addCitiesToIndex(
  buildCityIndex([{ city: 'Munich', citySlug: 'munich' }, { city: 'Frankfurt', citySlug: 'frankfurt' }]),
  [
    { slug: 'nuremberg', name: 'Nuremberg', localName: 'Nürnberg', altNames: ['Nurnberg'] },
    { slug: 'freiburg-im-breisgau', name: 'Freiburg im Breisgau', localName: null, altNames: [] },
    { slug: 'frankfurt-am-main', name: 'Frankfurt am Main', localName: null, altNames: ['Frankfurt'] },
  ],
)

const HEADER = 'ID,Country,City,Dance Styles,Name,Description,Whatsapp,Instagram,Facebook,Type,Admin,Admin Number,Source,Type,Added,WeDance Profile,Note,Solution'
const sheet = (...lines: string[]) => parseCsv([HEADER, ...lines].join('\n'))

describe('parseCsv', () => {
  it('keeps commas, quotes and line breaks inside quoted fields', () => {
    expect(parseCsv('a,"b, c","say ""hi""\nthere"\r\nd,e,f\n')).toEqual([
      ['a', 'b, c', 'say "hi"\nthere'],
      ['d', 'e', 'f'],
    ])
  })
})

describe('mapGroupStyles', () => {
  it('maps the sheet\'s style text to city-page labels', () => {
    expect(mapGroupStyles('Salsa, Bachata, Kizomba')).toEqual(['Salsa', 'Bachata', 'Kizomba'])
    expect(mapGroupStyles('SBK')).toEqual(['Salsa', 'Bachata', 'Kizomba'])
    expect(mapGroupStyles('Salsa (NY/LA)')).toEqual(['Salsa'])
    expect(mapGroupStyles('Afro-Cuban, Salsa')).toEqual(['Afro', 'Salsa'])
    expect(mapGroupStyles('Discofox')).toEqual(['Discofox'])
    expect(mapGroupStyles('')).toEqual([])
  })
})

describe('matchGroupCity', () => {
  it('finds known cities by any of their names, never guesses regions', () => {
    expect(matchGroupCity('Munich', idx)?.slug).toBe('munich')
    expect(matchGroupCity('Nürnberg', idx)?.slug).toBe('nuremberg')
    expect(matchGroupCity('Frankfurt', idx)?.slug).toBe('frankfurt') // profiles' slug wins over the cities table
    expect(matchGroupCity('Freiburg', idx)?.slug).toBe('freiburg-im-breisgau')
    expect(matchGroupCity('Munich, Nürnberg', idx)?.slug).toBe('munich')
    expect(matchGroupCity('Rhein-Main', idx)).toBeNull()
    expect(matchGroupCity('Whole Germany', idx)).toBeNull()
    expect(matchGroupCity('', idx)).toBeNull()
  })
})

describe('mapGroupSheet', () => {
  it('turns sheet rows into groups under their city and says why others are left out', () => {
    const { groups, skipped } = mapGroupSheet(sheet(
      '17,Germany,Munich,,Munich Bachata,,https://chat.whatsapp.com/Gi3gGYO1R6SCkSwyjekAxR?mode=r,,,,,,Aina,Whatsapp,,,,',
      '77,Germany,Munich,"Salsa, Bachata, Kizomba",WeDanceMunich,,https://t.me/+QjRlCp1Df3wwNDFi,,,,,,,Whatsapp,,,,',
      '1,Germany,Nürnberg,,Nürnberg:,,https://chat.whatsapp.com/Gu5WkeceY0D15mHHXXmWMi,,,,,,Aina,Whatsapp,,,,',
      '5,Germany,Munich,,Erfurt Kizomba,,https://chat.whatsapp.com/BXbIKAMeFft4h6Mf3WPFCk,,,,,,Aina,Whatsapp,,,invalid,',
      '100,Germany,Munich,Salsa,Afro-Cuban Festivals,,https://chat.whatsapp.com/EQZNaRYvePCJWfyMsnOJva,,,private,,,,Whatsapp,,,"Please\nkeep it private",',
      '28,Germany,Rhein-Main,,UrbanKiz Rhein-Main,,https://chat.whatsapp.com/H5tcDiF9h3a9ZD42U6PVO4,,,,,,,Whatsapp,,,,',
      '55,Germany,,,Wonderland Festival Infos,,https://chat.whatsapp.com/HrEUzUiMJD58c9aGdSfcHz,,,,,,,Whatsapp,,,,',
      '82,Austria,Munich,,Salsa Austria,,,,,,,,,Whatsapp,,,,',
      ',,,,SBK EUROPE,,,https://instagram.com/sbkeurope,,,,,,,,,,',
      ',,,,,,,,,,,,,,,,,',
    ), idx)

    expect(groups).toEqual([
      expect.objectContaining({ line: 2, citySlug: 'munich', name: 'Munich Bachata', platform: 'whatsapp', inviteKey: 'chat.whatsapp.com/Gi3gGYO1R6SCkSwyjekAxR', styles: [] }),
      // the platform comes from the link, not the sheet's Type column
      expect.objectContaining({ line: 3, citySlug: 'munich', platform: 'telegram', inviteKey: 't.me/+qjrlcp1df3wwndfi', styles: ['Salsa', 'Bachata', 'Kizomba'] }),
      expect.objectContaining({ line: 4, citySlug: 'nuremberg', name: 'Nürnberg' }),
    ])
    expect(skipped.map(s => [s.line, s.reason])).toEqual([
      [5, 'marked_dead'],
      [6, 'private'],
      [7, 'unknown_city'],
      [8, 'no_city'],
      [9, 'no_link'],
      [10, 'no_link'],
    ])
  })

  it('fails loudly on a sheet without the needed columns', () => {
    expect(() => mapGroupSheet(parseCsv('Name,Link\nA,https://chat.whatsapp.com/x'), idx)).toThrow(/City, Name and Whatsapp/)
  })
})

describe('planGroupImport', () => {
  const { groups } = mapGroupSheet(sheet(
    '1,Germany,Munich,,Munich Bachata,,https://chat.whatsapp.com/AAA111,,,,,,,,,,,',
    '2,Germany,Munich,,Munich Bachata again,,https://www.chat.whatsapp.com/AAA111/,,,,,,,,,,,',
    '3,Germany,Munich,,Already listed,,https://chat.whatsapp.com/BBB222,,,,,,,,,,,',
    '4,Germany,Nürnberg,,New one,,https://chat.whatsapp.com/CCC333,,,,,,,,,,,',
  ), idx)

  it('imports each group once and skips groups the directory already has', () => {
    const plan = planGroupImport(groups, ['chat.whatsapp.com/BBB222'])
    expect(plan.insert.map(g => g.name)).toEqual(['Munich Bachata', 'New one'])
    expect(plan.repeated.map(g => g.name)).toEqual(['Munich Bachata again'])
    expect(plan.inDirectory.map(g => g.name)).toEqual(['Already listed'])
  })

  it('is a no-op on a second run', () => {
    const first = planGroupImport(groups, ['chat.whatsapp.com/BBB222'])
    const again = planGroupImport(groups, ['chat.whatsapp.com/BBB222', ...first.insert.map(g => g.inviteKey)])
    expect(again.insert).toEqual([])
  })

  it('writes visible, unverified community rows tagged as imported', () => {
    expect(groupImportRow(groups[0]!)).toEqual({
      citySlug: 'munich', name: 'Munich Bachata', platform: 'whatsapp', inviteUrl: 'https://chat.whatsapp.com/AAA111',
      inviteKey: 'chat.whatsapp.com/AAA111', styles: [], source: 'import', status: 'visible', kind: 'community', verified: false,
    })
  })
})
