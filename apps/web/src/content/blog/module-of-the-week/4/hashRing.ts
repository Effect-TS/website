// Geometry for HashRingVisual, shared by the build-time render and the
// browser script so both draw the same ring.
//
// Angles are degrees clockwise from the top. This is the textbook ring: the
// nearest point wins, and the ring wraps.

export const SIZE = 340
export const C = SIZE / 2
export const R = 120

export interface Point {
  readonly runner: number
  readonly angle: number
}

const f = (n: number) => n.toFixed(2)

export const polar = (angle: number, r: number) => {
  const t = (angle * Math.PI) / 180
  return { x: C + r * Math.sin(t), y: C - r * Math.cos(t) }
}

// The first `n` points of each active runner. `angles[k - 1][i]` is where
// runner k's point i + 1 lands.
export const pointsFor = (
  angles: ReadonlyArray<ReadonlyArray<number>>,
  runners: ReadonlyArray<number>,
  n: number,
): Array<Point> =>
  runners.flatMap((runner) =>
    angles[runner - 1]!.slice(0, n).map((angle) => ({ runner, angle })),
  )

const gap = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360
  return Math.min(d, 360 - d)
}

export const ownerOf = (angle: number, points: ReadonlyArray<Point>) => {
  let best = points[0]!
  for (const p of points)
    if (gap(angle, p.angle) < gap(angle, best.angle)) best = p
  return best.runner
}

// The stretch of ring each runner owns: from halfway to the previous point to
// halfway to the next one. Neighboring stretches of the same runner merge.
export const arcsFor = (points: ReadonlyArray<Point>) => {
  const sorted = [...points].sort((a, b) => a.angle - b.angle)
  const len = sorted.length
  if (len === 1) {
    const a = polar(0, R)
    const b = polar(180, R)
    return [
      {
        runner: sorted[0]!.runner,
        d: `M${f(a.x)} ${f(a.y)} A${R} ${R} 0 1 1 ${f(b.x)} ${f(b.y)} A${R} ${R} 0 1 1 ${f(a.x)} ${f(a.y)}`,
      },
    ]
  }
  const spans = sorted.map((p, i) => {
    const prev = sorted[(i - 1 + len) % len]!
    const next = sorted[(i + 1) % len]!
    const prevAngle = i === 0 ? prev.angle - 360 : prev.angle
    const nextAngle = i === len - 1 ? next.angle + 360 : next.angle
    return {
      runner: p.runner,
      from: (prevAngle + p.angle) / 2,
      to: (p.angle + nextAngle) / 2,
    }
  })
  const merged: typeof spans = []
  for (const s of spans) {
    const last = merged[merged.length - 1]
    if (last && last.runner === s.runner) last.to = s.to
    else merged.push({ ...s })
  }
  const first = merged[0]!
  const last = merged[merged.length - 1]!
  if (merged.length > 1 && first.runner === last.runner) {
    first.from = last.from - 360
    merged.pop()
  }
  return merged.map(({ runner, from, to }) => {
    const a = polar(from, R)
    const b = polar(to, R)
    const large = to - from > 180 ? 1 : 0
    return {
      runner,
      d: `M${f(a.x)} ${f(a.y)} A${R} ${R} 0 ${large} 1 ${f(b.x)} ${f(b.y)}`,
    }
  })
}

// Every point after a runner's first, as short ticks just outside the ring.
// The first point gets the big numbered marker instead.
export const ticksFor = (angles: ReadonlyArray<number>, n: number) =>
  angles
    .slice(1, n)
    .map((angle) => {
      const a = polar(angle, R + 6)
      const b = polar(angle, R + 13)
      return `M${f(a.x)} ${f(a.y)}L${f(b.x)} ${f(b.y)}`
    })
    .join("")

// Where the first point's tick and numbered badge go.
export const markerFor = (angle: number) => {
  const a = polar(angle, R - 10)
  const b = polar(angle, R + 10)
  const badge = polar(angle, R + 26)
  return {
    x1: f(a.x),
    y1: f(a.y),
    x2: f(b.x),
    y2: f(b.y),
    cx: f(badge.x),
    cy: f(badge.y),
  }
}
