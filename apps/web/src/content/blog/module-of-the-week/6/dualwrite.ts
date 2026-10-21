// Shared by the dual-write visuals. Dad's handler makes two writes, posting
// his joke to Slack and marking the message processed, in either order. A
// crash lands before, between, or after them, and on restart, cluster
// delivers the message again if it isn't processed.

export type Order = "post" | "mark"

// What a crash at `slot` leaves behind: 0 is before both writes, 1 between
// them, and 2 after both. On restart, an unprocessed message is delivered
// again, and Dad tells another joke, so Slack ends up with 0, 1, or 2.
export const outcome = (order: Order, slot: number) => {
  const posted = slot === 2 || (slot === 1 && order === "post")
  const processed = slot === 2 || (slot === 1 && order === "mark")
  const jokes = (posted ? 1 : 0) + (processed ? 0 : 1)
  return { posted, processed, jokes }
}

const reduceMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches
export const ease = "cubic-bezier(0.23, 1, 0.32, 1)"

// A crash marker that's dragged along `axis` and snaps to the nearest slot.
// Clicking a slot or using the arrow keys moves it too.
export function createCrashSlider(options: {
  track: HTMLElement
  marker: HTMLElement
  slots: ReadonlyArray<HTMLElement>
  axis: "x" | "y"
  initial: number
  onChange: (slot: number) => void
}) {
  const { track, marker, slots, axis, onChange } = options
  let slot = options.initial
  let at = 0

  const centers = () => {
    const t = track.getBoundingClientRect()
    return slots.map((el) => {
      const r = el.getBoundingClientRect()
      return axis === "x"
        ? (r.left + r.right) / 2 - t.left
        : (r.top + r.bottom) / 2 - t.top
    })
  }
  const nearest = (to: number) => {
    const c = centers()
    return c.reduce(
      (best, v, i) => (Math.abs(v - to) < Math.abs(c[best]! - to) ? i : best),
      0,
    )
  }
  const translate = (v: number) =>
    axis === "x" ? `translateX(${v}px)` : `translateY(${v}px)`
  const moveTo = (to: number, glide: boolean) => {
    const was = at
    at = to
    marker.style.transform = translate(at)
    if (glide && was !== at && !reduceMotion()) {
      marker.animate(
        [{ transform: translate(was) }, { transform: translate(at) }],
        {
          duration: 220,
          easing: ease,
        },
      )
    }
  }
  const set = (to: number, glide = true) => {
    slot = Math.min(slots.length - 1, Math.max(0, to))
    moveTo(centers()[slot]!, glide)
    marker.setAttribute("aria-valuenow", String(slot))
    for (const [i, el] of slots.entries())
      el.classList.toggle("is-current", i === slot)
    onChange(slot)
  }

  for (const [i, el] of slots.entries())
    el.addEventListener("click", () => set(i))
  marker.addEventListener("pointerdown", (e) => {
    marker.setPointerCapture(e.pointerId)
    marker.classList.add("is-dragging")
    const c = centers()
    const t = track.getBoundingClientRect()
    const origin = axis === "x" ? t.left : t.top
    let shown = slot
    const follow = (ev: PointerEvent) => {
      const v = (axis === "x" ? ev.clientX : ev.clientY) - origin
      moveTo(Math.min(c.at(-1)!, Math.max(c[0]!, v)), false)
      const n = nearest(at)
      if (n !== shown) onChange((shown = n))
    }
    const stop = () => {
      marker.classList.remove("is-dragging")
      marker.removeEventListener("pointermove", follow)
      set(nearest(at))
    }
    marker.addEventListener("pointermove", follow)
    marker.addEventListener("pointerup", stop, { once: true })
    marker.addEventListener("pointercancel", stop, { once: true })
  })
  marker.addEventListener("keydown", (e) => {
    const back = axis === "x" ? "ArrowLeft" : "ArrowUp"
    const ahead = axis === "x" ? "ArrowRight" : "ArrowDown"
    const to =
      e.key === back
        ? slot - 1
        : e.key === ahead
          ? slot + 1
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? slots.length - 1
              : null
    if (to === null) return
    e.preventDefault()
    set(to)
  })
  new ResizeObserver(() => moveTo(centers()[slot]!, false)).observe(track)

  set(slot, false)
  return { set, get: () => slot }
}

// Runs `change`, then slides each of `els` from where it was to where it is
export const flip = (els: ReadonlyArray<HTMLElement>, change: () => void) => {
  const was = els.map((el) => el.getBoundingClientRect())
  change()
  if (reduceMotion()) return
  for (const [i, el] of els.entries()) {
    const now = el.getBoundingClientRect()
    const dx = was[i]!.left - now.left
    const dy = was[i]!.top - now.top
    if (!dx && !dy) continue
    el.animate(
      [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
      {
        duration: 260,
        easing: ease,
      },
    )
  }
}
