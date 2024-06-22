import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command"
import { Icon } from "@/components/icons"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export function TraceSelector({
  traceIds,
  onSelect
}: {
  readonly traceIds: ReadonlyArray<string>
  readonly onSelect: (traceId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string>()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-label="Select a trace"
          aria-expanded={open}
          className="flex-1 justify-between md:max-w-[325px]"
        >
          {selected || "Select a trace..."}
          <Icon
            name="arrows-up-down"
            className="ml-2 h-4 w-4 shrink-0 opacity-50"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[325px] p-0">
        <Command>
          <CommandInput placeholder="Search traces..." />
          <CommandEmpty>No traces found.</CommandEmpty>
          <CommandGroup heading="Traces">
            <CommandList>
              {traceIds.map((traceId) => (
                <CommandItem
                  key={traceId}
                  onSelect={() => {
                    setSelected(traceId)
                    setOpen(false)
                    onSelect(traceId)
                  }}
                >
                  {traceId}
                  <Icon
                    name="check"
                    className={cn(
                      "ml-auto h-4 w-4",
                      selected === traceId ? "opacity-100" : "opacity-0"
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
