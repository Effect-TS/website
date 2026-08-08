import { useEffect, useMemo, useRef } from "react"
import type { VisualEffectState } from "@/features/visual-effect/model/domain"

export interface TransitionFlags {
  readonly justStarted: boolean
  readonly justCompleted: boolean
  readonly justFailed: boolean
  readonly justDied: boolean
}

export const deriveTransitionFlags = (
  previousTag: VisualEffectState["_tag"],
  currentTag: VisualEffectState["_tag"],
): TransitionFlags => ({
  justStarted: previousTag !== "Running" && currentTag === "Running",
  justCompleted: previousTag !== "Succeeded" && currentTag === "Succeeded",
  justFailed: previousTag !== "Failed" && currentTag === "Failed",
  justDied: previousTag !== "Died" && currentTag === "Died",
})

export const useNodeTransitionFlags = (
  state: VisualEffectState,
): TransitionFlags => {
  const previousTagRef = useRef<VisualEffectState["_tag"]>(state._tag)

  const transition = useMemo(
    () => deriveTransitionFlags(previousTagRef.current, state._tag),
    [state._tag],
  )

  useEffect(() => {
    previousTagRef.current = state._tag
  }, [state._tag])

  return transition
}
