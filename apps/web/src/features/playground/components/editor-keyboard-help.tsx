import { KeyboardIcon } from "lucide-react"
import { Button } from "@/components/ui/Button"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"

export function EditorKeyboardHelp() {
  return (
    <Popover>
      <PopoverTrigger
        aria-label="Editor keyboard controls"
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
          />
        }
      >
        <KeyboardIcon aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
        <PopoverTitle className="text-sm font-semibold">
          Editor keyboard controls
        </PopoverTitle>
        <PopoverDescription className="mt-2 text-sm text-muted-foreground">
          To use Tab to leave the editor, press Ctrl+M on Windows/Linux or
          Ctrl+Shift+M on macOS. Press again to indent with Tab.
        </PopoverDescription>
      </PopoverContent>
    </Popover>
  )
}
