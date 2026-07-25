import { ArrowRight } from "lucide-react"
import { MotionConfig, motion, useAnimate } from "motion/react"
import * as React from "react"
import type { ExampleDefinition } from "@/features/visual-effect/model/example-definition"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useEffectMotionValues } from "@/features/visual-effect/hooks/animation/useEffectMotionValues"
import { useEffectNodeAnimationController } from "@/features/visual-effect/hooks/animation/useEffectNodeAnimationController"
import { useNodeTransitionFlags } from "@/features/visual-effect/hooks/animation/useNodeTransitionFlags"
import { useSnippetHoverState } from "@/features/visual-effect/hooks/useSnippetHoverState"
import {
  snippetResultTargetKey,
  toStepSnippetTargetKey,
} from "@/features/visual-effect/model/snippet-highlights"
import { VisualEffectCodeSnippet } from "./VisualEffectCodeSnippet"
import { VisualEffectConfigPanel } from "./VisualEffectConfigPanel"
import { VisualEffectControls } from "./VisualEffectControls"
import { VisualEffectFinalizerPanel } from "./VisualEffectFinalizerPanel"
import { VisualEffectNode } from "./VisualEffectNode"
import {
  ExampleContext,
  StepContext,
  useExampleDefinition,
  useExampleState,
  useStepDefinition,
  useStepState,
} from "./VisualEffectProvider"
import { VisualEffectScheduleTimeline } from "./VisualEffectScheduleTimeline"

export function VisualEffect({ example }: { readonly example: ExampleDefinition }) {
  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delay={0}>
        <ExampleContext.Provider value={example}>
          <VisualEffectSurface />
        </ExampleContext.Provider>
      </TooltipProvider>
    </MotionConfig>
  )
}

function VisualEffectSurface() {
  const example = useExampleDefinition()
  const exampleState = useExampleState()
  const { delayedTarget, onHoverTargetChange } = useSnippetHoverState(example.key, 500)

  const isDied = exampleState._tag === "Died"
  const borderColor = isDied ? "rgba(127, 29, 29, 0.5)" : "#27272a"

  return (
    <motion.div
      className="flex w-full min-w-0 flex-col border shadow-2xl"
      initial={false}
      animate={{
        borderColor,
        boxShadow: isDied ? "0 0 10px rgba(220, 38, 38, 0.06)" : "0 0 0 0 rgba(59, 130, 250, 0)",
      }}
      transition={{
        borderColor: { duration: 0.2, ease: "easeInOut" },
        boxShadow: { duration: 0.2, ease: "easeInOut" },
      }}
    >
      <VisualEffectControls isDied={isDied} />
      <VisualEffectConfigPanel isDied={isDied} />
      <VisualEffectNodes isDied={isDied} onHoverTargetChange={onHoverTargetChange} />
      {example.features.finalizers && <VisualEffectFinalizerPanel />}
      {example.features.timeline && <VisualEffectScheduleTimeline />}
      <VisualEffectCodeSnippet snippet={example.code} activeTarget={delayedTarget} />
    </motion.div>
  )
}

function VisualEffectNodes({
  isDied,
  onHoverTargetChange,
}: {
  readonly isDied: boolean
  readonly onHoverTargetChange: (target: string | null) => void
}) {
  const example = useExampleDefinition()
  const borderColor = isDied ? "rgba(127, 29, 29, 0.5)" : "#27272a"

  return (
    <motion.div
      className="border-b bg-background p-6"
      initial={false}
      animate={{ borderColor }}
      onPointerLeave={() => onHoverTargetChange(null)}
      transition={{ borderColor: { duration: 0.2, ease: "easeInOut" } }}
    >
      <div className="flex items-center justify-start gap-6">
        {example.steps.length > 0 && (
          <React.Fragment>
            <div className="flex flex-wrap justify-center gap-6">
              {example.steps.map((step) => (
                <StepContext.Provider key={step.id} value={step}>
                  <VisualEffectStepNode onHoverTargetChange={onHoverTargetChange} />
                </StepContext.Provider>
              ))}
            </div>

            <div className="mb-6 flex items-center text-neutral-500">
              <ArrowRight className="size-6" fill="currentColor" />
            </div>
          </React.Fragment>
        )}

        <VisualEffectResultNode onHoverTargetChange={onHoverTargetChange} />
      </div>
    </motion.div>
  )
}

export function VisualEffectStepNode({
  onHoverTargetChange,
}: {
  readonly onHoverTargetChange: (target: string | null) => void
}) {
  const [scope] = useAnimate()
  const definition = useStepDefinition()
  const stepState = useStepState()
  const motionValues = useEffectMotionValues()
  const transition = useNodeTransitionFlags(stepState)
  const target = toStepSnippetTargetKey(definition.id)

  useEffectNodeAnimationController({
    scope,
    motion: motionValues,
    tag: stepState._tag,
    transition,
  })

  return (
    <VisualEffectNode
      label={definition.label}
      motionValues={motionValues}
      onPointerEnter={() => onHoverTargetChange(target)}
      onPointerLeave={() => onHoverTargetChange(null)}
      state={stepState}
      scope={scope}
    />
  )
}

export function VisualEffectResultNode({
  onHoverTargetChange,
}: {
  readonly onHoverTargetChange: (target: string | null) => void
}) {
  const [scope] = useAnimate()
  const exampleState = useExampleState()
  const motionValues = useEffectMotionValues()
  const transition = useNodeTransitionFlags(exampleState)

  useEffectNodeAnimationController({
    scope,
    motion: motionValues,
    tag: exampleState._tag,
    transition,
  })

  return (
    <VisualEffectNode
      label="result"
      motionValues={motionValues}
      onPointerEnter={() => onHoverTargetChange(snippetResultTargetKey)}
      onPointerLeave={() => onHoverTargetChange(null)}
      state={exampleState}
      scope={scope}
    />
  )
}
