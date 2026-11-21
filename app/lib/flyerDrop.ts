/**
 * Dropping flyers onto "Add flyers you've made" and Flyer styles (RAZ-1034).
 *
 * The logo upload already takes a drop (`ImageUpload`). These two areas only
 * opened the file picker. A drop and the picker share one rule: images only,
 * and only as many as slots are left.
 */
import { ref } from 'vue'

const DROP_IMAGE = 'Please drop an image file.'

/** Images the organiser can add. Other files are skipped. Nothing when the area is full. */
export function flyerImages(files: ArrayLike<File> | null | undefined, slots: number): File[] {
  if (!files || slots <= 0) return []
  const out: File[] = []
  for (const file of Array.from(files)) {
    if (!file.type.startsWith('image/')) continue
    out.push(file)
    if (out.length >= slots) break
  }
  return out
}

function draggedFiles(types: ArrayLike<string> | undefined): boolean {
  if (!types) return false
  return Array.from(types).includes('Files')
}

/** dragleave also fires when the pointer enters a child. Stay highlighted while it is still inside. */
function pointerStillInside(zone: EventTarget | null, related: EventTarget | null): boolean {
  if (!zone || related == null || !('contains' in zone)) return false
  const contains = (zone as { contains?: (node: unknown) => boolean }).contains
  if (typeof contains !== 'function') return false
  try {
    return contains.call(zone, related)
  } catch {
    return false
  }
}

export function createFlyerDrop(opts: {
  slotsLeft: () => number
  add: (files: File[]) => void
  reject: (message: string) => void
}) {
  const dragOver = ref(false)

  function onDragOver(event: DragEvent) {
    if (!draggedFiles(event.dataTransfer?.types) || opts.slotsLeft() <= 0) return
    dragOver.value = true
  }

  function onDragLeave(event: DragEvent) {
    if (pointerStillInside(event.currentTarget, event.relatedTarget)) return
    dragOver.value = false
  }

  function onDrop(event: DragEvent) {
    dragOver.value = false
    const incoming = event.dataTransfer?.files
    const files = flyerImages(incoming, opts.slotsLeft())
    if (files.length) {
      opts.add(files)
      return
    }
    if (opts.slotsLeft() <= 0) return
    if (incoming && incoming.length > 0) opts.reject(DROP_IMAGE)
  }

  function onInput(event: Event) {
    const input = event.target as HTMLInputElement
    const files = flyerImages(input.files, opts.slotsLeft())
    input.value = ''
    if (files.length) opts.add(files)
  }

  return { dragOver, onDragOver, onDragLeave, onDrop, onInput }
}
