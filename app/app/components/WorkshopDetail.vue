<script setup lang="ts">
import type { WorkshopWithId } from '~/types/schedule'
import { getStyleColor, getStyleDisplayName, getLevelDisplayName } from '~/utils/styleColors'

const props = defineProps<{
  workshop: WorkshopWithId | null
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
  share: [workshop: WorkshopWithId]
}>()

const styleColor = computed(() => getStyleColor(props.workshop?.danceStyle))
const styleLabel = computed(() => getStyleDisplayName(props.workshop?.danceStyle))
const levelLabel = computed(() => getLevelDisplayName(props.workshop?.level))

const dayLabel = computed(() => {
  if (!props.workshop) return ''
  const d = new Date(props.workshop.day + 'T12:00:00Z')
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
})

const timeRange = computed(() => {
  if (!props.workshop) return ''
  return `${props.workshop.startTime} - ${props.workshop.endTime}`
})

function handleOverlayClick() {
  emit('close')
}

function handleShare() {
  if (props.workshop) {
    emit('share', props.workshop)
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="visible && workshop"
        class="fixed inset-0"
        style="z-index: 100; background: var(--color-bg-overlay, rgba(0,0,0,0.4));"
        @click.self="handleOverlayClick"
      >
        <!-- Bottom sheet -->
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="translate-y-full"
          enter-to-class="translate-y-0"
          leave-active-class="transition duration-200 ease-in"
          leave-from-class="translate-y-0"
          leave-to-class="translate-y-full"
        >
          <div
            v-if="visible"
            class="fixed bottom-0 left-1/2 w-full -translate-x-1/2 overflow-y-auto"
            style="
              z-index: 110;
              max-width: 428px;
              max-height: 70vh;
              background: var(--color-bg, #FFFFFF);
              border-radius: 16px 16px 0 0;
            "
            @click.stop
          >
            <!-- Drag handle -->
            <div class="flex justify-center" style="padding: 12px 0 16px;">
              <div
                style="
                  width: 32px;
                  height: 4px;
                  border-radius: 2px;
                  background: var(--color-border, #E2E2E4);
                "
              />
            </div>

            <!-- Content -->
            <div style="padding: 0 24px 32px;">
              <!-- Workshop name -->
              <h2
                class="font-bold"
                style="
                  font-size: 18px;
                  line-height: 1.3;
                  color: var(--color-text-primary, #1A1A1A);
                  margin-bottom: 8px;
                "
              >
                {{ workshop.name }}
              </h2>

              <!-- Artist -->
              <p
                v-if="workshop.artist"
                style="
                  font-size: 14px;
                  line-height: 1.5;
                  color: var(--color-text-secondary, #4A4A4A);
                  margin-bottom: 4px;
                "
              >
                with {{ workshop.artist }}
              </p>

              <!-- Day + Time -->
              <p
                style="
                  font-size: 14px;
                  color: var(--color-text-secondary, #4A4A4A);
                  margin-bottom: 4px;
                "
              >
                <span class="font-bold">{{ dayLabel }}</span> {{ timeRange }}
              </p>

              <!-- Room -->
              <p
                style="
                  font-size: 14px;
                  color: var(--color-text-secondary, #4A4A4A);
                  margin-bottom: 4px;
                "
              >
                {{ workshop.roomName }}
              </p>

              <!-- Style badge -->
              <span
                v-if="styleLabel"
                class="inline-block font-semibold"
                :style="{
                  fontSize: '11px',
                  lineHeight: '1.3',
                  backgroundColor: styleColor,
                  color: '#FFFFFF',
                  borderRadius: '10px',
                  padding: '2px 8px',
                  marginBottom: '4px',
                }"
              >
                {{ styleLabel }}
              </span>

              <!-- Level -->
              <p
                v-if="levelLabel"
                style="
                  font-size: 14px;
                  color: var(--color-text-secondary, #4A4A4A);
                  margin-bottom: 4px;
                "
              >
                Level: {{ levelLabel }}
              </p>

              <!-- Description -->
              <p
                v-if="workshop.description"
                style="
                  font-size: 14px;
                  line-height: 1.5;
                  color: var(--color-text-secondary, #4A4A4A);
                  margin-top: 8px;
                "
              >
                {{ workshop.description }}
              </p>

              <!-- Share button -->
              <button
                class="mt-5 w-full font-semibold"
                style="
                  font-size: 14px;
                  border: 1px solid var(--color-interactive, #E8453C);
                  border-radius: 8px;
                  padding: 12px;
                  background: transparent;
                  color: var(--color-interactive, #E8453C);
                  cursor: pointer;
                  transition: background 100ms ease-out;
                "
                @click="handleShare"
                @mouseenter="($event.target as HTMLElement).style.background = 'var(--color-brand-primary-light, #FEF2F1)'"
                @mouseleave="($event.target as HTMLElement).style.background = 'transparent'"
              >
                Share this workshop
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
