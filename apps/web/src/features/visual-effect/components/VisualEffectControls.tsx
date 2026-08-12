import { motion } from "motion/react"
import * as React from "react"
import { canReset } from "@/features/visual-effect/model/domain"
import { VisualEffectControlsIcon } from "./VisualEffectControlsIcon"
import {
  useExampleControls,
  useExampleDefinition,
  useExampleState,
  useSoundControls,
} from "./VisualEffectProvider"

export function VisualEffectControls({ isDied }: { readonly isDied: boolean }) {
  const example = useExampleDefinition()
  const exampleState = useExampleState()
  const controls = useExampleControls()
  const sound = useSoundControls()
  const [isHovered, setIsHovered] = React.useState(false)
  const [isPressed, setIsPressed] = React.useState(false)
  const [hasInteracted, setHasInteracted] = React.useState(false)
  const isRunning = exampleState._tag === "Running"
  const isResettable = canReset(exampleState)

  const handleClick = () => {
    setHasInteracted(true)
    sound.unlockSounds()

    if (isRunning) {
      controls.stop()
    } else if (isResettable) {
      controls.reset()
    } else {
      controls.start()
    }
  }

  const title = example.title
  const subtitle = example.subtitle

  const borderColor = isDied ? "rgba(127, 29, 29, 0.5)" : "#27272a"
  const headerBackground = isDied
    ? isHovered
      ? "rgba(24, 24, 27, 0.5)"
      : "rgba(0, 0, 0, 0.5)"
    : isHovered
      ? "rgba(51, 51, 56, 0.9)"
      : "rgba(39, 39, 42, 0.9)"

  return (
    <motion.button
      className="flex w-full cursor-pointer items-start gap-3 border-b px-6 py-4 text-left"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setIsPressed(false)
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onClick={handleClick}
      initial={false}
      animate={{
        borderColor,
        backgroundColor: headerBackground,
      }}
      transition={{
        borderColor: { duration: 0.2, ease: "easeInOut" },
        backgroundColor: { duration: 0.15, ease: "easeInOut" },
      }}
      aria-label={`${isRunning ? "Stop" : isResettable ? "Reset" : "Run"} ${title}`}
    >
      <VisualEffectControlsIcon
        isAttracting={!hasInteracted && !isHovered && !isRunning}
        isHovered={isHovered}
        isPressed={isPressed}
        state={exampleState}
      />

      <span className="flex min-w-0 flex-1 flex-col gap-1 text-neutral-400">
        <span className="flex items-baseline gap-2 font-mono text-base leading-tighter font-semibold whitespace-nowrap">
          <span className="text-white">{title}</span>
          {subtitle && <span className="font-medium">{subtitle}</span>}
        </span>
        <span className="text-left text-sm leading-4">
          {example.description}
        </span>
      </span>
    </motion.button>
  )
}
