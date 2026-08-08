import { Volume2, VolumeX } from "lucide-react"
import * as React from "react"
import type { SoundPreference } from "@/features/visual-effect/model/sound"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"
import { useSoundControls, useSoundSettings } from "./VisualEffectProvider"

const SOUND_OPTIONS: ReadonlyArray<{
  readonly value: SoundPreference
  readonly label: string
}> = [
  { value: "system", label: "system" },
  { value: "on", label: "on" },
  { value: "off", label: "off" },
]

export function VisualEffectSoundToggle() {
  const sound = useSoundControls()
  const settings = useSoundSettings()
  const [isHydrated, setIsHydrated] = React.useState(false)

  React.useEffect(() => {
    setIsHydrated(true)
  }, [])

  const displayedPreference = isHydrated ? settings.preference : "system"

  const handleSelect = (preference: SoundPreference) => {
    if (preference === "on") {
      sound.unlockSounds()
    }
    sound.setSoundPreference(preference)
  }

  return (
    <div className="flex items-center gap-2.5">
      <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-[0.28em] text-muted-foreground uppercase">
        {settings.enabled ? (
          <Volume2 className="size-3 shrink-0" />
        ) : (
          <VolumeX className="size-3 shrink-0" />
        )}
        <span>Sound</span>
      </span>

      <ToggleGroup
        className="bg-zinc-900 p-1"
        value={[displayedPreference]}
        onValueChange={(value) => {
          const nextPreference = value[0]
          if (nextPreference !== undefined) {
            handleSelect(nextPreference)
          }
        }}
        aria-label="Visual effect sound preference"
      >
        {SOUND_OPTIONS.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            className={cn(
              "cursor-pointer bg-transparent text-muted-foreground",
              "data-pressed:bg-zinc-950 data-pressed:text-foreground hover:data-pressed:text-foreground",
            )}
            size="sm"
            aria-label={`Sound ${option.label}`}
          >
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
