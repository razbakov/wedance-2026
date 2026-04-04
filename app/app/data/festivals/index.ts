import type { FestivalConfig } from '~/types/schedule'
import { rovinjFestival } from './rovinj-summer-bachata-2026'

/**
 * Registry of available festival configurations.
 * To add a new festival, create its config file and add it here.
 */
const festivals: Record<string, FestivalConfig> = {
  'rovinj-summer-bachata-2026': rovinjFestival,
}

/**
 * The active festival for the current deployment.
 * Change this value to switch which festival the app displays.
 */
const ACTIVE_FESTIVAL = 'rovinj-summer-bachata-2026'

/**
 * Get the currently active festival configuration.
 */
export function getActiveFestival(): FestivalConfig {
  const config = festivals[ACTIVE_FESTIVAL]
  if (!config) {
    throw new Error(`Festival "${ACTIVE_FESTIVAL}" not found in registry.`)
  }
  return config
}

/**
 * Get a festival configuration by slug.
 */
export function getFestivalBySlug(slug: string): FestivalConfig | undefined {
  return festivals[slug]
}
