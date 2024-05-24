"use client"

import React, { useCallback, useEffect, useState } from "react"
import * as RadioGroup from "@radix-ui/react-radio-group"
import { Icon } from "../icons"
import { useTheme } from "next-themes"

const themes = [
  { id: "light", name: "Light Mode", icon: "sun" },
  { id: "dark", name: "Dark Mode", icon: "moon" },
  { id: "system", name: "System Preference", icon: "gear" }
]

export function ThemeSwitcher() {
  const { theme: initialTheme, setTheme: persistTheme } = useTheme()
  const [theme, setTheme] = useState<string>()

  useEffect(() => {
    setTheme(initialTheme)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const setThemeAndPersist = useCallback(
    (theme: string) => {
      persistTheme(theme)
      setTheme(theme)
    },
    [setTheme, persistTheme]
  )

  return (
    <div className="h-8 bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-600 dark:to-zinc-900 rounded-lg p-px">
      <RadioGroup.Root
        className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-900 h-full rounded-[7px]"
        value={theme}
        onValueChange={setThemeAndPersist}
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
                theme === id
                  ? "bg-zinc-200 dark:bg-zinc-700"
                  : "bg-transparent"
              } h-full flex items-center justify-center text-black dark:text-white w-6 py-0.5 rounded-[3px]`}
            >
              <Icon name={icon as Icon.Name} className="h-3.5" />
            </div>
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
    </div>
  )
}
