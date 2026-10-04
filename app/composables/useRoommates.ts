export function useRoommates(festivalSlug: string) {
  const { $trpc } = useNuxtApp()
  const lookingForRoommate = ref(false)
  const roommateOthers = ref<{ name: string; photo: string | null }[]>([])

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
    } catch (e) {
      lookingForRoommate.value = prev
      throw e
    }
  }

  return { lookingForRoommate, roommateOthers, loadRoommateStatus, toggleRoommate }
}
