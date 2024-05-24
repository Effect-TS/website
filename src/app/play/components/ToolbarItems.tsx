"use client"
import { Icon } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import {
  Result,
  useRxSet,
  useRxSuspenseSuccess,
  useRxValue
} from "@effect-rx/rx-react"
import { useCallback, useEffect, useState } from "react"
import { useShareRx } from "../context"
import { importRx } from "../rx"
import { WorkspaceProvider } from "@/workspaces/WorkspaceProvider"

export function ToolbarItems() {
  const workspace = useRxSuspenseSuccess(importRx).value
  return (
    <WorkspaceProvider workspace={workspace}>
      <ShareButton />
    </WorkspaceProvider>
  )
}

// interface Preset {
//   readonly id: string
//   readonly name: string
// }
//
// function PresetSelector({
//   presets,
//   ...props
// }: {
//   readonly presets: ReadonlyArray<Preset>
// }) {
//   const [open, setOpen] = useState(false)
//   const [selectedPreset, setSelectedPreset] = useState<Preset>()
//   const router = useRouter()
//
//   return (
//     <Popover open={open} onOpenChange={setOpen} {...props}>
//       <PopoverTrigger asChild>
//         <Button
//           variant="outline"
//           role="combobox"
//           aria-label="Load a preset..."
//           aria-expanded={open}
//           className="flex-1 justify-between md:max-w-[200px] lg:max-w-[300px]"
//         >
//           {selectedPreset ? selectedPreset.name : "Load a preset..."}
//           <Icon
//             name="arrows-up-down"
//             className="ml-2 h-4 w-4 shrink-0 opacity-50"
//           />
//         </Button>
//       </PopoverTrigger>
//       <PopoverContent className="w-[300px] p-0">
//         <Command>
//           <CommandInput placeholder="Search presets..." />
//           <CommandEmpty>No presets found.</CommandEmpty>
//           <CommandGroup heading="Examples">
//             <CommandList>
//               {presets.map((preset) => (
//                 <CommandItem
//                   key={preset.id}
//                   onSelect={() => {
//                     setSelectedPreset(preset)
//                     setOpen(false)
//                   }}
//                 >
//                   {preset.name}
//                   <Icon
//                     name="check"
//                     className={cn(
//                       "ml-auto h-4 w-4",
//                       selectedPreset?.id === preset.id
//                         ? "opacity-100"
//                         : "opacity-0"
//                     )}
//                   />
//                 </CommandItem>
//               ))}
//             </CommandList>
//           </CommandGroup>
//           <CommandGroup className="pt-0">
//             <CommandItem onSelect={() => router.push("/examples")}>
//               More examples
//             </CommandItem>
//           </CommandGroup>
//         </Command>
//       </PopoverContent>
//     </Popover>
//   )
// }

export function ShareButton() {
  const rx = useShareRx()
  const share = useRxSet(rx)

  const onOpen = useCallback(
    (open: boolean) => {
      if (!open) return
      share()
    },
    [share]
  )

  return (
    <Popover onOpenChange={onOpen}>
      <PopoverTrigger asChild>
        <Button variant="secondary">Share</Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[400px]">
        <ShareContent />
      </PopoverContent>
    </Popover>
  )
}

function ShareContent() {
  const rx = useShareRx()
  const result = useRxValue(rx, (result) =>
    !result.waiting && Result.isSuccess(result)
      ? ({
          link: result.value,
          loading: false
        } as const)
      : ({
          link: "",
          loading: true
        } as const)
  )

  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timeout = setTimeout(() => {
      setCopied(false)
    }, 2000)
    return () => {
      clearTimeout(timeout)
    }
  }, [copied, setCopied])
  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(result.link)
    setCopied(true)
  }, [setCopied, result.link])

  return (
    <>
      <div className="flex flex-col space-y-2 text-center sm:text-left">
        <h3 className="text-lg font-semibold">Share</h3>
        <p className="text-sm font-medium text-muted-foreground">
          Use the link to share this playground with others.
        </p>
      </div>
      <div className="flex items-center space-x-2 pt-4">
        <div className="grid flex-1 gap-2">
          <Label htmlFor="link" className="sr-only">
            Link
          </Label>
          <Input
            id="link"
            placeholder="Loading..."
            value={result.link}
            readOnly
            className="h-9"
          />
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="px-3"
          disabled={result.loading}
          onClick={handleCopyLink}
        >
          <span className="sr-only">Copy</span>
          {copied ? (
            <Icon name="check" className="h-4 w-4" />
          ) : (
            <Icon
              name={result.loading ? "loading" : "clipboard"}
              className={`h-4 w-4 ${result.loading ? "animate-spin" : ""}`}
            />
          )}
        </Button>
      </div>
    </>
  )
}
