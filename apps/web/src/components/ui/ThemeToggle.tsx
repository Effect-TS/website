import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { Monitor, Moon, Sun } from "lucide-react"
import {
  selectThemeAtom,
  themeAtom,
  type Theme,
} from "@/components/ui/atoms/theme"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "./dropdown-menu"
import { cn } from "@/lib/utils"

const options: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "light", icon: Sun, label: "Light" },
  { value: "system", icon: Monitor, label: "System" },
]

export default function ThemeToggle({
  className = "",
}: {
  className?: string
}) {
  const theme = useAtomValue(themeAtom)
  const selectTheme = useAtomSet(selectThemeAtom)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Change theme"
        className={cn(
          "flex min-h-6 min-w-6 items-center justify-center text-muted-foreground transition-colors hover:text-foreground",
          className,
        )}
      >
        <Sun size={20} className="dark:hidden" aria-hidden="true" />
        <Moon size={20} className="hidden dark:block" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        aria-label="Theme"
        align="end"
        sideOffset={8}
        className="w-36 rounded-md border border-border-strong bg-popover px-0 py-1 shadow-lg ring-0"
      >
        <DropdownMenuRadioGroup value={theme}>
          {options.map(({ value, icon: Icon, label }) => (
            <DropdownMenuRadioItem
              key={value}
              value={value}
              onClick={() => selectTheme(value)}
              closeOnClick
              className="gap-2.5 rounded-none py-2 pl-3 text-muted-foreground aria-checked:text-foreground"
            >
              <Icon className="size-[15px]" aria-hidden="true" />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
