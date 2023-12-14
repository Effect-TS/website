"use client"
import { useEffect, useState } from "react"
import * as RadioGroup from "@radix-ui/react-radio-group"
import { Icon, IconName } from "../icons"

const themes = [
  { id: "light", name: "Light Mode", icon: "sun" },
  { id: "dark", name: "Dark Mode", icon: "moon" },
  { id: "system", name: "System Preference", icon: "gear" }
]

export const ThemeSwitcher = () => {
  const [theme, setTheme] = useState<string>()

  useEffect(() => {
    const handleEvent = () => setTheme(localStorage?.theme || "system")
    handleEvent()
    window.addEventListener("storage", handleEvent)
    return () => window.removeEventListener("storage", handleEvent)
  }, [])

  useEffect(() => {
    if (!theme) return
    if (theme === "system") localStorage.removeItem("theme")
    else localStorage.theme = theme
    if (theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches))
      document.documentElement.classList.add("dark")
    else document.documentElement.classList.remove("dark")
  }, [theme])

  return (
    <div className="h-8 bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-600 dark:to-zinc-900 rounded-lg p-px">
      <RadioGroup.Root
        className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-900 h-full rounded-[7px]"
        value={theme}
        onValueChange={setTheme}
        aria-label="Theme"
      >
        {themes.map(({ id, name, icon }) => (
          <RadioGroup.Item
            key={id}
            className="p-px h-full data-[state=checked]:bg-gradient-to-b data-[state=checked]:from-zinc-300 data-[state=checked]:to-zinc-400 dark:data-[state=checked]:from-zinc-400 dark:data-[state=checked]:to-zinc-600 rounded data-[state=unchecked]:bg-transparent"
            value={id}
            aria-label={name}
          >
            <div
              className={`${
                theme === id ? "bg-zinc-200 dark:bg-zinc-700" : "bg-transparent"
              } h-full flex items-center justify-center text-black dark:text-white w-6 py-0.5 rounded-[3px]`}
            >
              <Icon name={icon as IconName} className="h-3.5" />
            </div>
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
    </div>
  )
}
