export interface RoommateEntry {
  name: string
  photo: string | null
  city: string | null
  username: string | null
}

export function useRoommates(festivalSlug: string) {
  const { $trpc } = useNuxtApp()
  const lookingForRoommate = ref(false)
  const roommateOthers = ref<RoommateEntry[]>([])

  async function loadRoommateStatus() {
    try {
      const result = await $trpc.roommate.list.query({ festivalSlug })
      lookingForRoommate.value = result.looking
      roommateOthers.value = result.others
    } catch (e) {
      console.warn('Failed to load roommate status:', e)
    }
  }

  async function toggleRoommate() {
    const prev = lookingForRoommate.value
    lookingForRoommate.value = !prev
    try {
      const result = await $trpc.roommate.toggle.mutate({ festivalSlug })
      lookingForRoommate.value = result.looking
      if (result.looking) {
        await loadRoommateStatus()
      }
    } catch (e) {
      lookingForRoommate.value = prev
      console.warn('Failed to toggle roommate:', e)
    }
  }

  return { lookingForRoommate, roommateOthers, loadRoommateStatus, toggleRoommate }
}
