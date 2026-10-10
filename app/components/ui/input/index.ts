import type { VariantProps } from "class-variance-authority"
import { cva } from "class-variance-authority"

export { default as Input } from "./Input.vue"

/**
 * The WeDance field surface, shared by Input, Select and Textarea so all three
 * line up: white card, --input border, rounded-xl, red focus halo. Matches the
 * hand-rolled `inputStyle` on settings / onboarding / for-events.
 */
export const controlVariants = cva(
  [
    "w-full min-w-0 border border-input bg-card text-foreground font-sans text-sm",
    "placeholder:text-muted-foreground/60 outline-none transition-[border-color,box-shadow] duration-150",
    "focus:border-primary/60 focus:shadow-wd-focus",
    "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--destructive)_18%,transparent)]",
    "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-70",
  ],
  {
    variants: {
      size: {
        default: "h-11 rounded-xl px-3.5",
        sm: "h-9 rounded-lg px-3",
      },
    },
    defaultVariants: { size: "default" },
  },
)

export type ControlVariants = VariantProps<typeof controlVariants>
