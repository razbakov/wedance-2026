import { describe, expect, it } from 'vitest'
import { artistTermsText } from './artistDeal'

describe('artistTermsText', () => {
  it('joins what they set, and is empty when they set nothing', () => {
    expect(artistTermsText({ fee: '€120 per class', needs: 'train from Vienna' })).toBe('Fee €120 per class · Needs: train from Vienna')
    expect(artistTermsText({ needs: 'a room' })).toBe('Needs: a room')
    expect(artistTermsText(null)).toBe('')
    expect(artistTermsText({})).toBe('')
  })
})
