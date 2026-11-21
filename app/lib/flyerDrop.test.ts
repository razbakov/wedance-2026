import { describe, expect, it, vi } from 'vitest'
import { createFlyerDrop, flyerImages } from './flyerDrop'

function file(name: string, type: string) {
  return new File(['x'], name, { type })
}

function drag(types: string[]) {
  return { dataTransfer: { types } } as unknown as DragEvent
}

describe('flyerImages', () => {
  it('keeps images and skips other files', () => {
    const png = file('a.png', 'image/png')
    const pdf = file('notes.pdf', 'application/pdf')
    const jpg = file('b.jpg', 'image/jpeg')
    expect(flyerImages([png, pdf, jpg], 5)).toEqual([png, jpg])
  })

  it('takes only as many images as slots are left', () => {
    const files = ['a', 'b', 'c'].map(n => file(`${n}.png`, 'image/png'))
    expect(flyerImages(files, 2).map(f => f.name)).toEqual(['a.png', 'b.png'])
  })

  it('returns nothing when there is no room', () => {
    expect(flyerImages([file('a.png', 'image/png')], 0)).toEqual([])
  })

  it('returns nothing when no files were given', () => {
    expect(flyerImages(null, 3)).toEqual([])
    expect(flyerImages(undefined, 3)).toEqual([])
  })
})

describe('createFlyerDrop', () => {
  function setup(slots = 5) {
    const add = vi.fn()
    const reject = vi.fn()
    let left = slots
    const drop = createFlyerDrop({
      slotsLeft: () => left,
      add,
      reject,
    })
    return { drop, add, reject, setSlots: (n: number) => { left = n } }
  }

  it('adds image files from a drop and ignores the rest', () => {
    const { drop, add, reject } = setup()
    const png = file('party.png', 'image/png')
    drop.onDrop({
      dataTransfer: { files: [png, file('x.pdf', 'application/pdf')] },
    } as unknown as DragEvent)
    expect(add).toHaveBeenCalledWith([png])
    expect(reject).not.toHaveBeenCalled()
    expect(drop.dragOver.value).toBe(false)
  })

  it('asks for an image when a drop has files but none are images', () => {
    const { drop, add, reject } = setup()
    drop.onDrop({
      dataTransfer: { files: [file('x.pdf', 'application/pdf')] },
    } as unknown as DragEvent)
    expect(add).not.toHaveBeenCalled()
    expect(reject).toHaveBeenCalledWith('Please drop an image file.')
  })

  it('does nothing when the upload is already full', () => {
    const { drop, add, reject } = setup(0)
    drop.onDrop({
      dataTransfer: { files: [file('a.png', 'image/png'), file('x.pdf', 'application/pdf')] },
    } as unknown as DragEvent)
    expect(add).not.toHaveBeenCalled()
    expect(reject).not.toHaveBeenCalled()
  })

  it('adds images chosen from the file picker', () => {
    const { drop, add } = setup(1)
    const png = file('a.png', 'image/png')
    const input = { files: [png, file('b.png', 'image/png'), file('c.txt', 'text/plain')], value: 'picked' }
    drop.onInput({ target: input } as unknown as Event)
    expect(add).toHaveBeenCalledWith([png])
    expect(input.value).toBe('')
  })

  it('highlights while image files are dragged over the zone', () => {
    const { drop } = setup()
    drop.onDragOver(drag(['Files']))
    expect(drop.dragOver.value).toBe(true)
  })

  it('stays highlighted when the pointer moves onto a child of the zone', () => {
    const { drop } = setup()
    drop.onDragOver(drag(['Files']))
    const child = { tag: 'child' }
    const zone = { contains: (n: unknown) => n === child }
    drop.onDragLeave({ currentTarget: zone, relatedTarget: child } as unknown as DragEvent)
    expect(drop.dragOver.value).toBe(true)
  })

  it('clears the highlight when the pointer leaves the zone', () => {
    const { drop } = setup()
    drop.onDragOver(drag(['Files']))
    const zone = { contains: () => false }
    drop.onDragLeave({ currentTarget: zone, relatedTarget: null } as unknown as DragEvent)
    expect(drop.dragOver.value).toBe(false)
  })

  it('does not highlight a drag that is not files', () => {
    const { drop } = setup()
    drop.onDragOver(drag(['text/plain']))
    expect(drop.dragOver.value).toBe(false)
  })

  it('does not highlight a file drag when there is no room', () => {
    const { drop } = setup(0)
    drop.onDragOver(drag(['Files']))
    expect(drop.dragOver.value).toBe(false)
  })
})
