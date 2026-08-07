import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const toggleGroupVariants = cva(
  "inline-flex items-center rounded-lg border border-zinc-800/90 bg-black/70 p-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
)

const toggleGroupItemVariants = cva(
  "inline-flex items-center justify-center rounded-md font-mono font-semibold text-zinc-500 uppercase transition-all duration-150 outline-none hover:text-zinc-100 focus-visible:ring-2 focus-visible:ring-zinc-400/50 data-disabled:pointer-events-none data-disabled:opacity-50 data-pressed:bg-zinc-100 data-pressed:text-zinc-950 data-pressed:shadow-[0_0_0_1px_rgba(255,255,255,0.08)] hover:data-pressed:text-zinc-950",
  {
    variants: {
      size: {
        sm: "min-w-[3.5rem] px-2 py-1 text-[9px] tracking-[0.28em]",
        default: "min-w-[4rem] px-2.5 py-1 text-[10px] tracking-[0.28em]",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
)

function ToggleGroup<Value extends string>({
  className,
  ...props
}: ToggleGroupPrimitive.Props<Value>) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      className={cn(toggleGroupVariants(), className)}
      {...props}
    />
  )
}

function ToggleGroupItem<Value extends string>({
  className,
  size,
  ...props
}: TogglePrimitive.Props<Value> &
  VariantProps<typeof toggleGroupItemVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      className={cn(toggleGroupItemVariants({ size }), className)}
      {...props}
    />
  )
}

export { ToggleGroup, ToggleGroupItem }
