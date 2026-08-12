import { useAtomValue } from "@effect/atom-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TabsIndicator } from "@/components/ui/tabs-indicator"
import { useTabsIndicator } from "@/hooks/useTabsIndicator"
import { cn } from "@/lib/utils"
import type { ControlRenderProps } from "../model/example-definition"
import { useControlWrite } from "./VisualEffectProvider"

export function VisualEffectSegmentedControl<A extends string>({
  control,
  label,
  options,
}: ControlRenderProps<A> & {
  readonly label: string
  readonly options: ReadonlyArray<A>
}) {
  const value = useAtomValue(control.atom)
  const setValue = useControlWrite(control)
  const { indicatorRect, rootRef } = useTabsIndicator(value)

  return (
    <div
      ref={rootRef}
      className="flex flex-wrap items-center justify-start gap-3"
    >
      <span className="font-mono text-sm tracking-wider text-neutral-500 select-none">
        {label}
      </span>
      <Tabs
        value={value}
        onValueChange={(value) => setValue(value)}
        className="min-w-0"
      >
        <TabsList className="relative isolate w-fit flex-wrap overflow-hidden rounded-lg border border-neutral-700/30 bg-neutral-800/50 p-1 group-data-[orientation=horizontal]/tabs:h-auto">
          <TabsIndicator
            rect={indicatorRect}
            variant="fill"
            className="rounded-md bg-neutral-700/80 shadow-md"
          />

          {options.map((option) => (
            <TabsTrigger
              key={option}
              className={cn(
                "relative z-10 cursor-pointer border-none px-3 py-1.5 text-center font-mono text-sm shadow-none",
                "bg-transparent text-neutral-400 hover:text-neutral-300 dark:text-neutral-400 dark:hover:text-neutral-300",
                "data-active:border-transparent data-active:bg-transparent data-active:font-medium data-active:text-white data-active:shadow-none",
                "dark:data-active:border-transparent dark:data-active:bg-transparent dark:data-active:text-white",
                "group-data-[variant=default]/tabs-list:data-active:shadow-none",
              )}
              value={option}
            >
              {option}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  )
}
