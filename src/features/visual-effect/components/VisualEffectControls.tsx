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
  const isRunning = exampleState._tag === "Running"
  const isResettable = canReset(exampleState)

  const handleClick = () => {
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
  const cta = isRunning
    ? "Click to stop"
    : isResettable
      ? "Click to reset"
      : "Click to run an Effect"

  const borderColor = isDied ? "rgba(127, 29, 29, 0.5)" : "#27272a"
  const headerBackground = isDied ? "rgba(0, 0, 0, 0.5)" : "rgba(39, 39, 42, 0.9)"

  return (
    <motion.div
      className="flex border-b px-6 py-4"
      initial={false}
      animate={{
        borderColor,
        backgroundColor: headerBackground,
      }}
      transition={{
        borderColor: { duration: 0.2, ease: "easeInOut" },
        backgroundColor: { duration: 0.2, ease: "easeInOut" },
      }}
    >
      <motion.button
        className="-m-2 flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-lg bg-zinc-950 p-2"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onClick={handleClick}
        initial={{ backgroundColor: "rgb(255, 255, 255, 0)" }}
        whileHover={{
          backgroundColor: "rgb(255, 255, 255, 0.05)",
          transition: { backgroundColor: { duration: 0.15, ease: "easeInOut" } },
        }}
        aria-label={isRunning ? "Stop example" : "Run example"}
      >
        <VisualEffectControlsIcon
          isHovered={isHovered}
          isPressed={isPressed}
          state={exampleState}
        />

        <span className="flex min-w-0 flex-1 flex-col gap-1 text-neutral-400">
          <span className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="flex items-baseline gap-2 font-mono text-base leading-tighter font-semibold whitespace-nowrap">
              <span className="text-white">{title}</span>
              {subtitle && <span className="font-medium">{subtitle}</span>}
            </span>
            <span className="shrink-0 font-mono text-xs whitespace-nowrap">{cta}</span>
          </span>
          <span className="text-left text-sm leading-4">{example.description}</span>
        </span>
      </motion.button>
    </motion.div>
  )
}
