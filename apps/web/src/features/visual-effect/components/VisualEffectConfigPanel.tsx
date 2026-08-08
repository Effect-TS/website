import { motion } from "motion/react"
import * as React from "react"
import { useExampleDefinition } from "./VisualEffectProvider"

export function VisualEffectConfigPanel({
  isDied,
}: {
  readonly isDied: boolean
}) {
  const example = useExampleDefinition()

  if (example.controls.length === 0) {
    return null
  }

  const borderColor = isDied ? "rgba(127, 29, 29, 0.5)" : "#27272a"
  const backgroundColor = isDied
    ? "rgba(9, 9, 11, 0.78)"
    : "rgba(9, 9, 11, 0.72)"

  return (
    <motion.section
      className="border-b"
      initial={false}
      animate={{
        borderColor,
        backgroundColor,
      }}
      transition={{
        borderColor: { duration: 0.2, ease: "easeInOut" },
        backgroundColor: { duration: 0.2, ease: "easeInOut" },
      }}
    >
      <div className="bg-linear-to-t from-neutral-800/40 to-neutral-800/20 px-6 py-4">
        {example.controls.map((control) => (
          <React.Fragment key={control.id}>{control.render()}</React.Fragment>
        ))}
      </div>
    </motion.section>
  )
}
