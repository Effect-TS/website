import { Search } from "lucide-react"
import { memo, useEffect, useState } from "react"
import { NAVIGATION_EVENTS } from "@/lib/navigation"
import { cn } from "@/lib/utils"

interface SearchTriggerIslandProps {
  readonly mode: "desktop" | "mobile"
  readonly onTrigger?: () => void
  readonly openDelayMs?: number
}

interface SearchShortcut {
  readonly label: "⌘" | "Ctrl"
  readonly aria: "Meta+K" | "Control+K"
}

const META_SHORTCUT: SearchShortcut = {
  label: "⌘",
  aria: "Meta+K",
}

const CONTROL_SHORTCUT: SearchShortcut = {
  label: "Ctrl",
  aria: "Control+K",
}

const hasPlatformString = (value: unknown): value is { readonly platform: string } => {
  return (
    typeof value === "object" &&
    value !== null &&
    "platform" in value &&
    typeof Reflect.get(value, "platform") === "string"
  )
}

const detectSearchShortcut = (): SearchShortcut => {
  if (typeof navigator === "undefined") {
    return META_SHORTCUT
  }

  const userAgentData = Reflect.get(navigator, "userAgentData")
  const platformFromUserAgentData = hasPlatformString(userAgentData)
    ? userAgentData.platform
    : undefined

  const platform = (platformFromUserAgentData ?? navigator.platform).toLowerCase()
  const userAgent = navigator.userAgent.toLowerCase()

  const isApplePlatform =
    platform.includes("mac") ||
    platform.includes("iphone") ||
    platform.includes("ipad") ||
    platform.includes("ipod") ||
    userAgent.includes("mac os") ||
    userAgent.includes("iphone") ||
    userAgent.includes("ipad")

  return isApplePlatform ? META_SHORTCUT : CONTROL_SHORTCUT
}

const SearchTriggerIsland = memo(function SearchTriggerIsland({
  mode,
  onTrigger,
  openDelayMs = 0,
}: SearchTriggerIslandProps) {
  const [shortcut, setShortcut] = useState<SearchShortcut>(META_SHORTCUT)

  useEffect(() => {
    setShortcut(detectSearchShortcut())
  }, [])

  const onClick = () => {
    onTrigger?.()

    if (openDelayMs > 0) {
      window.setTimeout(() => {
        window.dispatchEvent(new Event(NAVIGATION_EVENTS.SEARCH_OPEN))
      }, openDelayMs)
      return
    }

    window.dispatchEvent(new Event(NAVIGATION_EVENTS.SEARCH_OPEN))
  }

  if (mode === "mobile") {
    return (
      <button
        type="button"
        aria-label="Open search"
        aria-keyshortcuts={shortcut.aria}
        onClick={onClick}
        className="mt-6 flex w-full cursor-pointer appearance-none items-center gap-3 rounded-md border border-zinc-500 bg-transparent px-3 py-2.5 text-zinc-400 transition-colors hover:border-zinc-600 hover:text-white"
      >
        <Search className="h-4.5 w-4.5" aria-hidden="true" />
        <span className="text-sm">Search</span>
        <kbd className="ml-auto inline-flex items-center justify-center gap-0.5 text-xs leading-none text-zinc-300">
          <span>{shortcut.label}</span>
          <span>K</span>
        </kbd>
      </button>
    )
  }

  return (
    <button
      type="button"
      aria-label="Open search"
      aria-keyshortcuts={shortcut.aria}
      onClick={onClick}
      className={cn(
        "flex h-8 cursor-pointer appearance-none items-center gap-2 rounded-md border bg-transparent px-2.5 py-1 text-sm transition-colors",
        "border-zinc-300 text-zinc-500 hover:border-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-white",
      )}
    >
      <Search className="h-4.5 w-4.5" aria-hidden="true" />
      <kbd className="inline-flex items-center justify-center gap-0.5 text-[12px] leading-none text-zinc-400/80 dark:text-zinc-400/80">
        <span>{shortcut.label}</span>
        <span>K</span>
      </kbd>
    </button>
  )
})

export default SearchTriggerIsland
