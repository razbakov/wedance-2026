import { describe, it, expect } from 'vitest'
import { controlAria, errorIdFor, fieldContext, hintIdFor, mergeDescribedBy } from './field'

describe('mergeDescribedBy', () => {
  it('joins, trims blanks and dedupes', () => {
    expect(mergeDescribedBy('a', undefined, 'b  a', '', null, false, 'c')).toBe('a b c')
  })
  it('returns undefined when empty', () => {
    expect(mergeDescribedBy(undefined, '', null)).toBeUndefined()
  })
})

describe('fieldContext', () => {
  it('describes by the hint only while valid', () => {
    expect(fieldContext({ id: 'x', hint: 'Help' })).toEqual({
      id: 'x', describedBy: 'x-hint', invalid: false, disabled: false, required: false,
    })
  })
  it('puts the error first when invalid', () => {
    const c = fieldContext({ id: 'x', hint: 'Help', error: 'Required', required: true })
    expect(c.describedBy).toBe(`${errorIdFor('x')} ${hintIdFor('x')}`)
    expect(c.invalid).toBe(true)
    expect(c.required).toBe(true)
  })
  it('has no describedby without hint or error', () => {
    expect(fieldContext({ id: 'x', error: '' }).describedBy).toBeUndefined()
  })
})

describe('controlAria', () => {
  it('works with no field and no attrs', () => {
    expect(controlAria({})).toEqual({
      'id': undefined, 'aria-describedby': undefined, 'aria-invalid': undefined, 'aria-required': undefined, 'disabled': undefined,
    })
  })
  it('takes id, describedby and invalid from the field', () => {
    const field = fieldContext({ id: 'email', hint: 'h', error: 'e', disabled: true })
    expect(controlAria({}, field)).toEqual({
      'id': 'email', 'aria-describedby': 'email-error email-hint', 'aria-invalid': 'true', 'aria-required': undefined, 'disabled': true,
    })
  })
  it('lets an explicit id win and merges fieldAttrs-style describedby without duplicates', () => {
    const field = fieldContext({ id: 'email', error: 'e' })
    const out = controlAria({ 'id': 'mine', 'aria-describedby': 'email-error', 'aria-invalid': 'true' }, field)
    expect(out.id).toBe('mine')
    expect(out['aria-describedby']).toBe('email-error')
    expect(out['aria-invalid']).toBe('true')
  })
  it('honours the invalid prop and native disabled/required attrs', () => {
    const out = controlAria({ invalid: true, disabled: '', required: '' })
    expect(out['aria-invalid']).toBe('true')
    expect(out.disabled).toBe(true)
    expect(out['aria-required']).toBe('true')
  })
})
