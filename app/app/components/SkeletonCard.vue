<script setup lang="ts">
/**
 * Skeleton loading card placeholder.
 * Matches the WorkshopCard dimensions with shimmer animation.
 * Per QA-010 / UI Spec Screen 5 (Loading State).
 */
</script>

<template>
  <div
    class="flex w-[140px] min-h-[120px] flex-shrink-0 flex-col gap-[4px] rounded-lg bg-white p-3"
    style="box-shadow: 0 1px 3px rgba(0,0,0,0.08);"
  >
    <!-- Room label skeleton -->
    <div class="skeleton-shimmer h-[10px] w-[50px] rounded" />
    <!-- Workshop name skeleton (2 lines) -->
    <div class="skeleton-shimmer h-[14px] w-full rounded" />
    <div class="skeleton-shimmer h-[14px] w-[80%] rounded" />
    <!-- Artist skeleton -->
    <div class="skeleton-shimmer mt-1 h-[12px] w-[70%] rounded" />
    <!-- Time skeleton -->
    <div class="skeleton-shimmer h-[12px] w-[60%] rounded" />
    <!-- Badge skeleton -->
    <div class="skeleton-shimmer mt-auto h-[18px] w-[50px] rounded-full" />
  </div>
</template>
