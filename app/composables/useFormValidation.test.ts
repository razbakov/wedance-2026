import { describe, it, expect } from 'vitest'
import { reactive, ref } from 'vue'
import { RegisterSchema, ResetPasswordSchema } from '#shared/validation'
import { useFormValidation } from './useFormValidation'

describe('useFormValidation', () => {
  it('hides errors until a submit fails, then shows every invalid field', () => {
    const form = reactive({ name: '', email: '', password: '' })
    const { errors, validate } = useFormValidation(RegisterSchema, form)
    expect(errors.value).toEqual({})

    expect(validate().success).toBe(false)
    expect(errors.value).toEqual({
      name: 'Name is required.',
      email: 'Email is required.',
      password: 'Password is required.',
    })
  })

  it('clears each message live as its field is fixed', () => {
    const form = reactive({ name: '', email: '', password: '' })
    const { errors, validate } = useFormValidation(RegisterSchema, form)
    validate()

    form.name = 'Ana'
    form.email = 'ana@'
    expect(errors.value).toEqual({ email: 'Enter a valid email address.', password: 'Password is required.' })

    form.email = 'ana@example.com'
    form.password = 'long-enough'
    expect(errors.value).toEqual({})
  })

  it('hides errors again after a successful submit or reset()', () => {
    const form = reactive({ name: 'Ana', email: 'ana@example.com', password: 'long-enough' })
    const { errors, validate, reset } = useFormValidation(RegisterSchema, form)

    const result = validate()
    expect(result.success && result.data.email).toBe('ana@example.com')
    form.name = '' // e.g. the form is cleared after sending
    expect(errors.value).toEqual({})

    validate()
    expect(errors.value.name).toBe('Name is required.')
    reset()
    expect(errors.value).toEqual({})
  })

  it('accepts getters for state and schema', () => {
    const password = ref('12345678')
    const confirm = ref('1234')
    const { errors, validate, fieldAttrs } = useFormValidation(
      () => ResetPasswordSchema,
      () => ({ password: password.value, confirmPassword: confirm.value }),
    )
    validate()
    expect(errors.value).toEqual({ confirmPassword: 'Passwords do not match.' })
    expect(fieldAttrs('confirmPassword', 'confirm-error')).toEqual({ 'aria-invalid': 'true', 'aria-describedby': 'confirm-error' })
    expect(fieldAttrs('password', 'password-error')).toEqual({ 'aria-invalid': undefined, 'aria-describedby': undefined })
  })
})
