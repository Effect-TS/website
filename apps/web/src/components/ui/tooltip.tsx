import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"
import { motion, type HTMLMotionProps } from "motion/react"
import { cn } from "@/lib/utils"

function TooltipProvider({
  delay = 0,
  ...props
}: TooltipPrimitive.Provider.Props) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delay={delay}
      {...props}
    />
  )
}

function Tooltip({ ...props }: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

function TooltipTrigger({ ...props }: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  animated = true,
  arrowClassName,
  className,
  side = "top",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  children,
  keepMounted = true,
  motionStyle,
  presence = false,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<
    TooltipPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  > & {
    readonly animated?: boolean | undefined
    readonly arrowClassName?: string | undefined
    readonly keepMounted?: boolean | undefined
    readonly motionStyle?: HTMLMotionProps<"div">["style"] | undefined
    readonly presence?: boolean | undefined
  }) {
  const resolvedMotionStyle =
    motionStyle === undefined
      ? undefined
      : (popupStyle: HTMLMotionProps<"div">["style"] | undefined) => ({
          ...popupStyle,
          ...motionStyle,
        })

  return (
    <TooltipPrimitive.Portal keepMounted={keepMounted}>
      <TooltipPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            "z-50 inline-flex w-fit max-w-xs origin-(--transform-origin) items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs text-background has-data-[slot=kbd]:pr-1.5 **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-50 **:data-[slot=kbd]:rounded-sm",
            className,
          )}
          render={
            animated
              ? presence
                ? (popupProps) => (
                    <motion.div
                      {...(popupProps as any)}
                      style={
                        resolvedMotionStyle?.(popupProps.style as any) ??
                        (popupProps.style as any)
                      }
                      initial={{
                        opacity: 0,
                        scale: 0.85,
                        y: 12,
                        filter: "blur(8px)",
                      }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        y: 0,
                        filter: "blur(0px)",
                      }}
                      exit={{
                        opacity: 0,
                        scale: 0.85,
                        y: 12,
                        filter: "blur(8px)",
                      }}
                      transition={{
                        type: "spring",
                        bounce: 0.12,
                        visualDuration: 0.28,
                      }}
                    />
                  )
                : (popupProps, state) => (
                    <motion.div
                      {...(popupProps as any)}
                      style={
                        resolvedMotionStyle?.(popupProps.style as any) ??
                        (popupProps.style as any)
                      }
                      initial={false}
                      animate={{
                        opacity: state.open ? 1 : 0,
                        scale: state.open ? 1 : 0.85,
                        y: state.open ? 0 : 12,
                        filter: state.open ? "blur(0px)" : "blur(8px)",
                      }}
                      transition={{
                        type: "spring",
                        bounce: 0.12,
                        visualDuration: 0.28,
                      }}
                    />
                  )
              : undefined
          }
          {...props}
        >
          {children}
          <TooltipPrimitive.Arrow
            className={cn(
              "z-50 size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-[2px] bg-foreground fill-foreground data-[side=bottom]:top-1 data-[side=inline-end]:top-1/2! data-[side=inline-end]:-left-1 data-[side=inline-end]:-translate-y-1/2 data-[side=inline-start]:top-1/2! data-[side=inline-start]:-right-1 data-[side=inline-start]:-translate-y-1/2 data-[side=left]:top-1/2! data-[side=left]:-right-1 data-[side=left]:-translate-y-1/2 data-[side=right]:top-1/2! data-[side=right]:-left-1 data-[side=right]:-translate-y-1/2 data-[side=top]:-bottom-2.5",
              arrowClassName,
            )}
          />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
