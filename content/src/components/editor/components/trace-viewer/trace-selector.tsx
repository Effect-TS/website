import { useState } from "react"
import { useRxValue } from "@effect-rx/rx-react"
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { cn } from "@/lib/css/utils"
import {
  useDevTools,
  useSelectedSpan,
  useSelectedSpanIndex
} from "../../context/devtools"

export function TraceSelector() {
  const [open, setOpen] = useState(false)
  const devTools = useDevTools()
  const rootSpans = useRxValue(devTools.rootSpans)
  const [span, setSelectedSpan] = useSelectedSpan()
  const selectedSpanIndex = useSelectedSpanIndex()
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-label="Select a trace"
          aria-expanded={open}
          className="flex-1 justify-between md:min-w-[350px] bg-[--sl-color-bg] hover:bg-[--sl-color-gray-6] dark:hover:bg-[--sl-color-gray-5] border border-[--sl-color-text] cursor-pointer"
        >
          {span?.traceId || "Select a trace..."}
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-80" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0">
        <Command className="bg-[--sl-color-bg]">
          <CommandInput placeholder="Search traces..." className="placeholder:text-[--sl-color-text]" />
          <CommandEmpty>No traces found.</CommandEmpty>
          <CommandGroup heading="Traces" className="[&_[cmdk-group-heading]]:text-[--sl-color-text]">
            <CommandList>
              {rootSpans.map((root, index) => (
                <CommandItem
                  key={root.traceId}
                  className="text-[--sl-color-white] data-[selected=true]:bg-[--sl-color-gray-6] dark:data-[selected=true]:bg-[--sl-color-gray-5] data-[selected=false]:hover:bg-[--sl-color-gray-6] data-[selected=false]:dark:hover:bg-[--sl-color-gray-5] cursor-pointer"
                  onSelect={() => {
                    setSelectedSpan(index)
                    setOpen(false)
                  }}
                >
                  {root.traceId}
                  <CheckIcon
                    className={cn(
                      "ml-auto h-4 w-4",
                      selectedSpanIndex === index ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandList>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
