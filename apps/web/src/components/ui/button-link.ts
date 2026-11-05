import { cva, type VariantProps } from "class-variance-authority"

/**
 * Shared CTA button styles for Astro and React call sites.
 * Outlines use `inset-ring`, not `border`, so every variant has the same height.
 */
export const buttonLinkVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-md font-medium no-underline transition-all hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]",
        secondary:
          "bg-card text-foreground inset-ring inset-ring-border-strong hover:bg-muted hover:inset-ring-subtle-foreground",
      },
      size: {
        sm: "px-4 py-2 text-sm",
        md: "px-5 py-2.5 text-sm",
        lg: "px-6 py-3 text-base",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
)

export type ButtonLinkVariantProps = VariantProps<typeof buttonLinkVariants>
