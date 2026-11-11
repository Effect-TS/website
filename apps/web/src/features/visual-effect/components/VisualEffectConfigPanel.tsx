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

  const borderColor = isDied ? "rgba(127, 29, 29, 0.5)" : "var(--border)"

  return (
    <motion.section
      className="border-b bg-background"
      initial={false}
      animate={{ borderColor }}
      transition={{ borderColor: { duration: 0.2, ease: "easeInOut" } }}
    >
      <div className="bg-linear-to-t from-muted/40 to-muted/20 px-6 py-4">
        {example.controls.map((control) => (
          <React.Fragment key={control.id}>{control.render()}</React.Fragment>
        ))}
      </div>
    </motion.section>
  )
}
