// Client-side pieces shared by the step-through visuals: stepping between
// states with the Step button and the step pills, the callout that explains
// each step next to what it's about, and envelopes that travel between parts
// of the diagram.
//
// The markup comes from StepPills, StepCallout, and StepControls, inside a
// root element with the `st` class.

export type Point = { x: number; y: number }
export type Rect = { left: number; right: number; top: number; bottom: number }

const reduceMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

// Where `el` sits, relative to `stage`
export const rel = (stage: Element, el: Element): Rect => {
  const s = stage.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  return {
    left: r.left - s.left,
    right: r.right - s.left,
    top: r.top - s.top,
    bottom: r.bottom - s.top,
  }
}

export const toPath = (pts: ReadonlyArray<Point>) =>
  pts
    .map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ")

// Moves the visual between its states, starting at state 0. Step pill n is
// state `first + n - 1`, so states before `first` set the scene and have no
// pill. With `first` at 0, the visual starts on step 1.
export function createStepper(options: {
  root: HTMLElement
  first: number
  last: number
  // Lays out state k from scratch, so Step and the pills agree
  apply: (k: number) => void
  // Animates the way from the current state to `next`. Stops early once
  // `alive` turns false, when the reader jumps elsewhere.
  advance?: (next: number, alive: () => boolean) => Promise<void>
  // Cancels whatever `advance` has running
  stop?: () => void
}) {
  const { root, first, last } = options
  const pills = root.querySelectorAll<HTMLElement>("[data-step-pill]")
  const step = root.querySelector<HTMLButtonElement>("[data-step]")!
  const reset = root.querySelector<HTMLButtonElement>("[data-reset]")
  let current = 0
  // Bumped when the reader jumps, so a running animation knows to stop
  let generation = 0
  let busy = false

  const render = (k: number) => {
    current = k
    options.apply(k)
    for (const p of pills) {
      const n = Number(p.dataset.stepPill) + first - 1
      if (n === k) p.setAttribute("aria-current", "step")
      else p.removeAttribute("aria-current")
      p.classList.toggle("is-done", n < k)
    }
    step.disabled = busy || k >= last
  }
  const setBusy = (b: boolean) => {
    busy = b
    step.disabled = b || current >= last
  }
  const stop = () => {
    generation++
    options.stop?.()
    setBusy(false)
  }
  const forward = async () => {
    const run = generation
    const next = current + 1
    setBusy(true)
    await options.advance?.(next, () => run === generation)
    if (run !== generation) return
    setBusy(false)
    render(next)
  }

  step.addEventListener("click", () => {
    if (busy || current >= last) return
    void forward()
  })
  reset?.addEventListener("click", () => {
    stop()
    render(0)
  })
  // Clicking a pill jumps there. Going forward, everything up to the state
  // before it is laid out at once, and only the last hop animates. Going back
  // just lays out the earlier state.
  for (const pill of pills) {
    pill.addEventListener("click", () => {
      const target = Number(pill.dataset.stepPill) + first - 1
      if (target === current && !busy) return
      stop()
      if (target <= current) {
        render(target)
        return
      }
      render(target - 1)
      void forward()
    })
  }

  render(0)
  return { current: () => current }
}

// Where a callout goes: under, left of, or above its target
export type Anchor = {
  el: Element
  place: "below" | "left" | "above"
  // Defaults to 230, or the target's own width with "target"
  width?: number | "target"
  // Left: the height the arrow points at. Defaults to the target's middle.
  // A function gets the callout's height.
  y?: number | ((height: number) => number)
  // Left: sit left of this instead of the target, like the card it's in
  edge?: Element
  // Above: sit above this instead of the target, like the table it's in
  over?: Element
  // Above: line up with the target's left end instead of its middle
  start?: boolean
}

// The callout: a step's note, right next to what it's about, with an arrow
// pointing at it. Pass a null anchor where there's no room, and the caption
// under the figure, which is always there for screen readers, shows instead.
export function createCallout(root: HTMLElement, stage: HTMLElement) {
  const callout = root.querySelector<HTMLElement>("[data-callout]")!
  const title = root.querySelector<HTMLElement>("[data-callout-title]")!
  const text = root.querySelector<HTMLElement>("[data-callout-text]")!
  const num = root.querySelector<HTMLElement>("[data-callout-num]")!
  const clamp = (v: number, lo: number, hi: number) =>
    Math.min(Math.max(v, lo), Math.max(lo, hi))

  const place = (anchor: Anchor | null) => {
    callout.hidden = anchor === null
    root.classList.toggle("has-callouts", anchor !== null)
    if (!anchor) return
    const { el, place } = anchor
    const t = rel(stage, el)
    const sw = stage.clientWidth
    const sh = stage.clientHeight
    const w = Math.min(
      anchor.width === "target" ? t.right - t.left : (anchor.width ?? 230),
      sw,
    )
    callout.style.width = `${w}px`
    const h = callout.offsetHeight
    const gap = 12
    let left: number
    let top: number
    let arrow: number
    if (place === "below") {
      top = t.bottom + gap
      left = clamp(t.left, 0, sw - w)
      arrow = clamp(t.left + 26 - left, 14, w - 14)
    } else if (place === "above") {
      top = (anchor.over ? rel(stage, anchor.over).top : t.top) - h - gap
      left = clamp(anchor.start ? t.left : t.right - w, 0, sw - w)
      arrow = clamp(
        anchor.start ? t.left + 26 - left : (t.left + t.right) / 2 - left,
        14,
        w - 14,
      )
    } else {
      const y =
        typeof anchor.y === "function"
          ? anchor.y(h)
          : (anchor.y ?? (t.top + t.bottom) / 2)
      const edge = anchor.edge ? rel(stage, anchor.edge).left : t.left
      left = clamp(edge - gap - w, 0, sw - w)
      top = clamp(y - h / 2, 0, sh - h)
      arrow = clamp(y - top, 14, h - 14)
    }
    callout.style.left = `${left}px`
    callout.style.top = `${top}px`
    callout.dataset.place = place
    callout.style.setProperty("--arrow", `${arrow}px`)
  }

  const show = (
    note: { title: string; text: string; num?: number | undefined },
    anchor: Anchor | null,
  ) => {
    const changed = text.textContent !== note.text
    text.textContent = note.text
    title.textContent = note.title
    num.textContent = note.num ? String(note.num) : ""
    num.hidden = !note.num
    place(anchor)
    if (changed && !reduceMotion()) {
      callout.classList.remove("is-in")
      void callout.offsetWidth
      callout.classList.add("is-in")
    }
  }

  return { show, place }
}

// Envelopes and the like, moving along a path of points on the stage
export function createTraveler(stage: HTMLElement) {
  const running = new Set<Animation>()
  const travel = (pts: ReadonlyArray<Point>, className: string, html: string) =>
    new Promise<void>((resolve) => {
      if (reduceMotion()) return resolve()
      const lengths = pts
        .slice(1)
        .map((p, i) => Math.hypot(p.x - pts[i]!.x, p.y - pts[i]!.y))
      const total = lengths.reduce((a, b) => a + b, 0) || 1
      let acc = 0
      const frames = pts.map((p, i) => {
        if (i > 0) acc += lengths[i - 1]!
        return {
          transform: `translate(${p.x - 10}px, ${p.y - 7}px)`,
          offset: acc / total,
        }
      })
      const el = document.createElement("span")
      el.className = className
      el.innerHTML = html
      stage.append(el)
      const anim = el.animate(frames, {
        duration: Math.min(1100, Math.max(600, total * 3)),
        easing: "ease-in-out",
      })
      running.add(anim)
      const done = () => {
        running.delete(anim)
        el.remove()
        resolve()
      }
      anim.onfinish = done
      anim.oncancel = done
    })
  const cancel = () => {
    for (const a of [...running]) a.cancel()
  }
  return { travel, cancel }
}

export const envelopeSvg = `<svg viewBox="0 0 22 16" aria-hidden="true"><rect x="0.75" y="0.75" width="20.5" height="14.5" rx="2.5"></rect><path d="M1.5 2 L11 9 L20.5 2"></path></svg>`
