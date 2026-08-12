import { useTabsIndicator } from "@/hooks/useTabsIndicator"
import { cn } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger } from "./tabs"
import { TabsIndicator } from "./tabs-indicator"

interface SegmentedControlProps<T extends string> {
  readonly value: T
  readonly onChange: (value: T) => void
  readonly options: ReadonlyArray<T>
  readonly className?: string
}

export function SegmentedControl<T extends string>({
  className,
  onChange,
  options,
  value,
}: SegmentedControlProps<T>) {
  const { indicatorRect, rootRef } = useTabsIndicator(value)

  return (
    <div ref={rootRef} className={cn("min-w-0", className)}>
      <Tabs value={value} onValueChange={(value) => onChange(value as T)}>
        <TabsList className="relative isolate w-fit flex-wrap rounded-lg border border-neutral-700/30 bg-neutral-800/50 p-1 group-data-[orientation=horizontal]/tabs:h-auto">
          <TabsIndicator
            rect={indicatorRect}
            className="rounded-md bg-neutral-700/80 shadow-md"
          />

          {options.map((option) => (
            <TabsTrigger
              key={option}
              className={cn(
                "relative z-10 cursor-pointer border-none px-3 py-1.5 text-center font-mono font-normal shadow-none",
                "bg-transparent text-neutral-400 hover:text-neutral-300",
                "data-active:border-transparent data-active:bg-transparent data-active:font-semibold data-active:text-white data-active:shadow-none",
                "dark:data-active:border-transparent dark:data-active:bg-transparent",
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
