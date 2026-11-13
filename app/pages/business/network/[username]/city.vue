<script setup lang="ts">
/**
 * /business/network/<handle>/city — the tools of a city page (city channels, migration 0066),
 * e.g. @wedancemunich: the weekly post, the city's official channels, and the local groups
 * dancers share. For the page's team (the city's admins) and WeDance admins.
 */
import { ArrowLeft } from 'lucide-vue-next'

definePageMeta({ layout: 'business' })

const route = useRoute()
const { $trpc } = useNuxtApp()
const username = computed(() => String(route.params.username))

type City = Awaited<ReturnType<typeof $trpc.cityChannels.forPage.query>>
const city = ref<City>(null)
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try { city.value = await $trpc.cityChannels.forPage.query({ username: username.value }) }
  catch (e: any) { error.value = e?.message || 'Couldn’t load this page.' }
  finally { loading.value = false }
})

const tab = ref<'schedule' | 'channels' | 'groups'>(route.query.tab === 'groups' ? 'groups' : route.query.tab === 'channels' ? 'channels' : 'schedule')
watch(tab, t => navigateTo({ query: { ...route.query, tab: t === 'schedule' ? undefined : t } }, { replace: true }))
useHead(() => ({ title: `${city.value?.cityName ?? 'City'} · City channels | Business | WeDance` }))
</script>

<template>
  <div>
    <NuxtLink :to="`/business/network/${username}`" class="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground">
      <ArrowLeft class="size-3.5" aria-hidden="true" /> @{{ username }}
    </NuxtLink>
    <AdminState v-if="loading" kind="loading" />
    <AdminState v-else-if="error" kind="error" :message="error" />
    <div v-else-if="!city" class="mt-8 rounded-2xl border-2 border-dashed border-input p-8 text-center text-sm text-muted-foreground">
      @{{ username }} doesn’t run a city on WeDance, or you’re not on its team.
    </div>
    <template v-else>
      <h1 class="mt-3 font-display text-2xl font-bold text-foreground">{{ city.cityName }}</h1>
      <p class="text-sm text-muted-foreground">You run WeDance’s own channels for {{ city.cityName }}.
        <NuxtLink :to="`/cities/${city.citySlug}`" class="font-bold underline">See the city page</NuxtLink>
      </p>
      <Tabs v-model="tab" class="mt-5">
        <TabsList>
          <TabsTrigger value="schedule">Weekly post</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="groups">Local groups</TabsTrigger>
        </TabsList>
        <TabsContent value="schedule" class="mt-4"><BusinessCitySchedule :city-slug="city.citySlug" /></TabsContent>
        <TabsContent value="channels" class="mt-4"><BusinessCityChannels :city-slug="city.citySlug" /></TabsContent>
        <TabsContent value="groups" class="mt-4"><BusinessCityGroups :city-slug="city.citySlug" /></TabsContent>
      </Tabs>
    </template>
  </div>
</template>
