import { Array } from "effect"
import { COLORS, SHADOW_COLORS, VFX } from "@/lib/animation"
import {
  NODE_PARTS,
  makeMotion,
  part,
  parts,
  type NodeTag,
} from "./node-motion"
import { run } from "./node-run"

export type { NodeTag } from "./node-motion"

/**
 * The look of a node that CSS cannot give: springs, jitter, shake, glitch and
 * flash. One `Animation` drives one node. It gets the state from `apply` and
 * writes styles on the node's parts. Everything here runs in the browser.
 * A Mount creates it, and a Command changes its state.
 */

export interface Animation {
  readonly apply: (tag: NodeTag) => void
  readonly dispose: () => void
}

const noAnimation: Animation = {
  apply: () => undefined,
  dispose: () => undefined,
}

/** Starts the animation of the node. `root` holds the node's parts. */
export const startAnimation = (
  root: HTMLElement,
  initial: NodeTag,
): Animation => {
  const outer = part(root, NODE_PARTS.outer)
  const container = part(root, NODE_PARTS.container)
  const content = part(root, NODE_PARTS.content)
  if (outer === null || container === null || content === null) {
    return noAnimation
  }

  const values = makeMotion()
  let tag = initial
  let previousTag: NodeTag = tag
  let cleanup: () => void = () => undefined

  const writeWidth = (width: number): void => {
    outer.style.width = `${width}px`
    container.style.width = `${width}px`
  }
  const writeTransform = (): void => {
    container.style.transform = `translate(${values.shakeX.get()}px, ${values.shakeY.get()}px) rotate(${values.rotation.get()}deg) translateZ(0)`
  }
  let blur = 0
  let lastRotation = 0
  let lastRotationAt = performance.now()
  let blurTimer: ReturnType<typeof setTimeout> | undefined
  const writeFilter = (): void => {
    container.style.filter =
      tag === "Died"
        ? `blur(${blur}px) contrast(${VFX.contrast.death}) brightness(${VFX.brightness.death})`
        : `blur(${blur}px)`
  }
  /** Blur follows how fast the node turns, and drops to none a moment after it stops. */
  const followRotation = (rotation: number): void => {
    const now = performance.now()
    const elapsed = Math.max(1, now - lastRotationAt)
    blur = Math.min((Math.abs(rotation - lastRotation) / elapsed) * 10, 1)
    lastRotation = rotation
    lastRotationAt = now
    writeFilter()
    if (blurTimer !== undefined) {
      clearTimeout(blurTimer)
    }
    blurTimer = setTimeout(() => {
      blur = 0
      writeFilter()
    }, 60)
  }
  const writeShadow = (): void => {
    const base =
      tag === "Running" ? SHADOW_COLORS.task.running : SHADOW_COLORS.small
    const glow = Math.min(values.glowIntensity.get(), 8)
    container.style.boxShadow =
      tag === "Died"
        ? glow > 0
          ? `${base}, 0 0 ${glow * 2}px ${COLORS.glow.death}`
          : base
        : glow > 0
          ? `${base}, 0 0 ${glow}px ${COLORS.glow.running}`
          : base
  }
  const writeRing = (): void => {
    Array.forEach(parts(root, NODE_PARTS.ring), (ring) => {
      ring.style.opacity = String(values.borderOpacity.get())
      ring.style.borderRadius = `${values.borderRadius.get()}px`
    })
  }
  const writeFlash = (): void => {
    Array.forEach(parts(root, NODE_PARTS.flash), (flash) => {
      flash.style.opacity = String(values.flashOpacity.get())
    })
  }

  const subscriptions = [
    values.nodeWidth.on("change", writeWidth),
    values.nodeHeight.on("change", (height) => {
      container.style.height = `${height}px`
    }),
    values.borderRadius.on("change", (radius) => {
      container.style.borderRadius = `${radius}px`
      writeRing()
    }),
    values.contentOpacity.on("change", (opacity) => {
      content.style.opacity = String(opacity)
    }),
    values.contentScale.on("change", (scale) => {
      content.style.scale = String(scale)
    }),
    values.borderOpacity.on("change", writeRing),
    values.flashOpacity.on("change", writeFlash),
    values.glowIntensity.on("change", writeShadow),
    values.rotation.on("change", (rotation) => {
      writeTransform()
      followRotation(rotation)
    }),
    values.shakeX.on("change", writeTransform),
    values.shakeY.on("change", writeTransform),
  ]

  const apply = (): void => {
    cleanup()
    cleanup = run(root, content, values, tag, previousTag, () => {
      writeShadow()
      writeFilter()
      writeRing()
      writeFlash()
    })
  }

  // The server markup already has the Idle look, so nothing is written until the state changes.
  if (tag !== "Idle") {
    apply()
  }

  return {
    apply: (next) => {
      if (next === tag) {
        return
      }
      previousTag = tag
      tag = next
      apply()
    },
    dispose: () => {
      if (blurTimer !== undefined) {
        clearTimeout(blurTimer)
      }
      cleanup()
      Array.forEach(subscriptions, (unsubscribe) => unsubscribe())
    },
  }
}
