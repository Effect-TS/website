import { useAtomSet, useAtomValue } from "@effect/atom-react"
import * as Option from "effect/Option"
import * as Atom from "effect/unstable/reactivity/Atom"
import * as React from "react"

export const useContainerWidth = () => {
  const { containerElementAtom, containerWidthAtom } = React.useMemo(() => {
    const containerElementAtom = Atom.make(Option.none<HTMLDivElement>())

    const containerWidthAtom = Atom.make((get) => {
      if (typeof window === "undefined") {
        return 0
      }

      const maybeElement = get(containerElementAtom)

      return Option.match(maybeElement, {
        onNone: () => 0,
        onSome: (element) => {
          const onResize = () => {
            get.setSelf(element.offsetWidth)
          }

          const observer = new ResizeObserver(onResize)
          observer.observe(element)
          get.addFinalizer(() => observer.unobserve(element))

          return element.offsetWidth
        },
      })
    })

    return { containerElementAtom, containerWidthAtom }
  }, [])

  const setElement = useAtomSet(containerElementAtom)
  const containerWidth = useAtomValue(containerWidthAtom)

  const containerRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      setElement(Option.fromNullOr(node))
    },
    [setElement],
  )

  return {
    containerRef,
    containerWidth,
  } as const
}
