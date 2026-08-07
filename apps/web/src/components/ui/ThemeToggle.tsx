import { useAtomSet, useAtomValue } from "@effect/atom-react"
import { Check, Monitor, Moon, Sun } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import {
  isDarkAtom,
  selectThemeAtom,
  themeAtom,
  type Theme,
} from "@/components/ui/atoms/theme"

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
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const theme = useAtomValue(themeAtom)
  const isDark = useAtomValue(isDarkAtom)
  const selectTheme = useAtomSet(selectThemeAtom)

  // Close menu on outside click or Escape
  useEffect(() => {
    if (!open) return
    const handlePointer = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", handlePointer)
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("mousedown", handlePointer)
      document.removeEventListener("keydown", handleKey)
    }
  }, [open])

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Change theme"
        className={`flex items-center justify-center transition-colors ${className}`}
      >
        {isDark ? (
          <Moon size={20} aria-hidden="true" />
        ) : (
          <Sun size={20} aria-hidden="true" />
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Theme"
          className="absolute top-full right-0 z-50 mt-2 w-36 overflow-hidden rounded-md border border-zinc-300 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          {options.map((opt) => {
            const Icon = opt.icon
            const isActive = theme === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => {
                  selectTheme(opt.value)
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                  isActive
                    ? "text-zinc-900 dark:text-white"
                    : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                <Icon size={15} aria-hidden="true" />
                <span className="flex-1">{opt.label}</span>
                {isActive && (
                  <Check
                    size={14}
                    className="text-zinc-500 dark:text-zinc-400"
                    aria-hidden="true"
                  />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
