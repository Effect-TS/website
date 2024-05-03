import { useEffect, useRef, type DependencyList, type EffectCallback } from "react"

export const useUpdate = (effect: EffectCallback, deps: DependencyList, applyChanges = true) => {
  const isInitialMount = useRef(true)
  /* eslint-disable-next-line */
  useEffect(
    isInitialMount.current || !applyChanges
      ? () => {
          isInitialMount.current = false;
        }
      : effect,
    deps,
  )
}
