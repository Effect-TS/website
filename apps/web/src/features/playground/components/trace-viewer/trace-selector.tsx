import { useAtom, useAtomValue } from "@effect/atom-react"
import { ChevronDownIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { selectedSpanIndexAtom } from "../../atoms/devtools"
import { rootSpansAtom } from "../../services/devtools"

export function TraceSelector() {
  const rootSpans = useAtomValue(rootSpansAtom)
  const [selectedIndex, setSelectedIndex] = useAtom(selectedSpanIndexAtom)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Select a trace"
        className="flex w-[350px] max-w-full cursor-pointer items-center justify-between rounded-md border border-input bg-field-background px-3 py-2 text-sm hover:bg-muted"
      >
        <span className="truncate">
          {rootSpans[selectedIndex]?.traceId || "Select a trace..."}
        </span>
        <ChevronDownIcon
          className="ml-2 size-4 shrink-0 opacity-80"
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        aria-label="Traces"
        className="max-h-60 w-[350px] max-w-[calc(100vw-2rem)] rounded-md border border-border-strong bg-field-background p-0 shadow-lg ring-0"
      >
        {rootSpans.length === 0 ? (
          <DropdownMenuItem
            disabled
            className="p-3 text-sm text-muted-foreground opacity-100 data-disabled:opacity-100"
          >
            No traces found.
          </DropdownMenuItem>
        ) : (
          <DropdownMenuRadioGroup value={String(selectedIndex)}>
            {rootSpans.map((root, index) => (
              <DropdownMenuRadioItem
                key={root.traceId}
                value={String(index)}
                onClick={() => setSelectedIndex(index)}
                closeOnClick
                className="cursor-pointer rounded-none py-2 pl-3 aria-checked:bg-control-selected"
              >
                <span className="truncate">{root.traceId}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
