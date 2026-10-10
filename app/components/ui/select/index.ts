export { default as Select } from "./Select.vue"

/** An option for Select's `options` prop. Plain strings are used as both label and value. */
export interface SelectOption {
  label: string
  value: string | number
  disabled?: boolean
}
