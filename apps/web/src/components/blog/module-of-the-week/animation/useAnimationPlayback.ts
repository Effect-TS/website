import { useEffect, useRef, useState } from "react"
import { useMotionValue } from "motion/react"

/** Shared playback for deterministic diagrams. Time is measured in seconds. */
export function useAnimationPlayback(duration: number) {
  const figure = useRef<HTMLElement>(null)
  const clock = useMotionValue(0)
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [visible, setVisible] = useState(false)
  const [compact, setCompact] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const element = figure.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setCompact(entry.contentRect.width <= 640)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => {
      setReducedMotion(preference.matches)
      setPlaying(!preference.matches)
    }
    update()
    preference.addEventListener("change", update)
    return () => preference.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    let inView = false
    const update = () => setVisible(inView && !document.hidden)
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry?.isIntersecting ?? false
      update()
    })
    if (figure.current) observer.observe(figure.current)
    document.addEventListener("visibilitychange", update)
    return () => {
      observer.disconnect()
      document.removeEventListener("visibilitychange", update)
    }
  }, [])

  useEffect(() => {
    if (!playing || !visible) return
    let previous: number | undefined
    let request: number
    const tick = (now: number) => {
      if (previous !== undefined) {
        const next = (clock.get() + (now - previous) / 1000) % duration
        clock.set(next)
        // Continuous motion uses the clock; text only needs ten updates/second.
        setTime((old) =>
          Math.floor(old * 10) === Math.floor(next * 10) ? old : next,
        )
      }
      previous = now
      request = requestAnimationFrame(tick)
    }
    request = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(request)
  }, [playing, visible, clock, duration])

  function seek(next: number) {
    const clamped = Math.max(0, Math.min(next, duration))
    clock.set(clamped)
    setTime(clamped)
  }

  return {
    figure,
    clock,
    time,
    playing,
    running: playing && visible,
    compact,
    reducedMotion,
    restart: () => seek(0),
    toggle: () => setPlaying((value) => !value),
    seek: (next: number) => {
      setPlaying(false)
      seek(next)
    },
  }
}
