import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { WD } from './brand'

const css = readFileSync(resolve(__dirname, '../assets/css/tailwind.css'), 'utf8')
const tokens = Object.fromEntries(
  [...css.matchAll(/--wd-([a-z0-9-]+):\s*(#[0-9a-f]{6});/g)].map(([, k, v]) => [k!.replace(/-(\w)/g, (_, c) => c.toUpperCase()), v]),
)

describe('WD palette', () => {
  it('matches every --wd-* hex token in tailwind.css', () => {
    expect(WD).toEqual(tokens)
  })
})
