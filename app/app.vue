<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>

  <!-- Mounted at the app root (not inside a layout) so the "Report a problem"
       widget appears on every page — including the many that opt out of the
       shared layout via definePageMeta({ layout: false }) (homepage, /festivals,
       /gigs, profiles, legal pages, …). -->
  <ReportProblem />
</template>
