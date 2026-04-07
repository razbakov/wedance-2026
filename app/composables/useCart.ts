const cartCount = ref(0)
const cartOpen = ref(false)

export function useCart() {
  function setCartCount(count: number) {
    cartCount.value = count
  }

  function toggleCart() {
    cartOpen.value = !cartOpen.value
  }

  function openCart() {
    cartOpen.value = true
  }

  function closeCart() {
    cartOpen.value = false
  }

  return {
    cartCount: readonly(cartCount),
    cartOpen: readonly(cartOpen),
    setCartCount,
    toggleCart,
    openCart,
    closeCart,
  }
}
