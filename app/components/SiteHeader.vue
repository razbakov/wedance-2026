<script setup lang="ts">
/**
 * SiteHeader — the shared V3 top bar (brand + nav + auth) used on every
 * page. One place to change the nav or the sign-in affordance.
 */
const { isSignedIn, dancerName, signOut } = useAuth()
const showSignIn = ref(false)

const links = [
  { to: '/festivals', label: 'Festivals', always: true },
  { to: '/cities', label: 'Cities', always: true },
  { to: '/artists', label: 'Artists', always: false },
  { to: '/gigs', label: 'Gigs', always: false },
  { to: '/for-events', label: 'Private events', always: false },
  { to: '/organizers', label: 'For organizers', always: false },
]
</script>

<template>
  <header class="border-b" style="border-color:#3b1f0d33;">
    <div class="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
      <Brand />
      <nav class="flex items-center gap-4 text-sm">
        <NuxtLink
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          class="italic hover:underline"
          :class="l.always ? '' : 'hidden sm:inline'"
        >{{ l.label }}</NuxtLink>

        <!-- Auth -->
        <template v-if="isSignedIn">
          <NuxtLink
            to="/my-plan"
            class="hidden sm:inline font-bold hover:underline"
            style="color:#3b1f0d; font-family:'Playfair Display', serif;"
          >{{ dancerName || 'My plan' }}</NuxtLink>
          <button
            type="button"
            class="italic hover:underline"
            style="color:#9a5614;"
            @click="signOut"
          >Sign out</button>
        </template>
        <button
          v-else
          type="button"
          class="inline-flex items-center px-4 py-1.5 rounded-full text-white text-xs font-bold uppercase tracking-wider shrink-0"
          style="background:linear-gradient(135deg, #dc2626, #f97316); box-shadow: 0 3px 0 -1px #b91c1c;"
          @click="showSignIn = true"
        >Sign in</button>
      </nav>
    </div>

    <SignUpModal v-model:open="showSignIn" action="signin" />
  </header>
</template>
