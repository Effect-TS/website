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
          "flex min-h-8 min-w-8 items-center justify-center text-muted-foreground hover:text-foreground",
          className,
        )}
      >
        <Sun size={18} className="hidden dark:block" aria-hidden="true" />
        <Moon size={18} className="dark:hidden" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent aria-label="Theme" align="end" className="min-w-36">
        <DropdownMenuRadioGroup value={theme}>
          {options.map(({ value, icon: Icon, label }) => (
            <DropdownMenuRadioItem
              key={value}
              value={value}
              onClick={() => selectTheme(value)}
              closeOnClick
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
