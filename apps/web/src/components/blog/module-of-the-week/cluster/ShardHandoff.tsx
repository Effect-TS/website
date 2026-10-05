import { useId, useMemo, useState, type KeyboardEvent } from "react"
import type { MotionValue } from "motion/react"
import { AnimationControls } from "../animation/AnimationControls"
import { AnimationFrame } from "../animation/AnimationFrame"
import { AnimationPacket } from "../animation/AnimationPacket"
import { useAnimationPlayback } from "../animation/useAnimationPlayback"
import "./ShardHandoff.css"

// Shard 276 changing hands as the reader starts and stops two runners.
//
// The runners are stacked on the left. Each shows which runner it thinks
// owns shard 276, worked out from the last runner list it read, and a slot
// where Dad runs while it holds the shard's lock.
//
// The database is on the right, drawn as the two tables cluster keeps:
// cluster_runners, which runners add and remove themselves from and reread
// on their own schedule, and cluster_locks, which says who actually runs
// the shard.
//
// Everything is simulated from the reader's clicks, so any order of starts
// and stops plays out the way cluster would handle it.

const SHARD = 276
const RUNNERS = [1, 2] as const
// The clock never loops; the scene is driven by the reader's clicks.
const FOREVER = 1e6
// One way, between a runner and the database
const TRIP = 1.2
// Each runner rereads the runner list every POLL_EVERY seconds, and asks
// for a lock it was refused again after RETRY seconds.
const POLL_EVERY = 10
const RETRY = 3
// When the other runner next rereads the list after a runner starts, or
// after one finishes stopping. Late enough on a start that the new runner
// gets there first, which is the interesting case.
const CATCH_UP_START = 6.5
const CATCH_UP_STOP = 1
// How long a runner takes to rebuild its ring and recompute assignments
// when the list it reads has changed. Really it's instant; this is long
// enough to see.
const RECOMPUTE = 1.2

type Status = "off" | "starting" | "running" | "stopping"
type Table = "runners" | "locks"

type RunnerView = {
  readonly status: Status
  // The runner list as of its last reread, or null before the first one
  readonly view: ReadonlyArray<number> | null
  // A changed list it's recomputing assignments from
  readonly computing: ReadonlyArray<number> | null
  readonly dad: boolean
  readonly taken: boolean
}

type State = {
  readonly listed: ReadonlyArray<number>
  readonly lock: number | null
  readonly runners: Readonly<Record<number, RunnerView>>
  // Something is still changing hands
  readonly busy: boolean
}

type Packet = {
  readonly key: string
  readonly start: number
  readonly runner: number
  readonly up: boolean
  readonly table: Table
  readonly label: string
  readonly tone?: "no" | "list" | "register"
}

type Click = { readonly at: number; readonly runner: number }

type Event =
  | { t: number; kind: "click"; runner: number }
  | { t: number; kind: "poll" | "read"; runner: number; epoch: number }
  | {
      t: number
      kind: "view" | "computed"
      runner: number
      epoch: number
      list: Array<number>
    }
  | { t: number; kind: "ask" | "retry"; runner: number; life: number }
  | {
      t: number
      kind: "answer"
      runner: number
      life: number
      granted: boolean
    }
  | { t: number; kind: "release" | "join" | "leave"; runner: number }

type Runner = {
  status: Status
  view: Array<number> | null
  computing: Array<number> | null
  hasLock: boolean
  asking: boolean
  taken: boolean
  // Bumped when the runner starts or stops, so its stale replies are dropped
  life: number
  // Bumped when its reread schedule changes, so stale rereads are dropped
  epoch: number
}

// The time of the last of `events` within the past 0.6 seconds, for flashes
const recent = (events: ReadonlyArray<{ at: number }>, now: number) => {
  let last: number | undefined
  for (const e of events) if (e.at <= now) last = e.at
  return last !== undefined && now - last < 0.6 ? last : undefined
}

const sameList = (a: ReadonlyArray<number>, b: ReadonlyArray<number>) =>
  a.length === b.length && a.every((n, i) => n === b[i])

// Plays the clicks out up to `horizon`: the messages sent, when each table
// was touched, and the state after every step.
function simulate(
  clicks: ReadonlyArray<Click>,
  horizon: number,
  incumbent: number,
  both: number,
) {
  const ownerOf = (list: ReadonlyArray<number>) =>
    list.length === 0 ? null : list.length === 1 ? list[0]! : both
  const db = { listed: [incumbent], lock: incumbent as number | null }
  const runners = new Map<number, Runner>(
    RUNNERS.map((n) => [
      n,
      n === incumbent
        ? {
            status: "running",
            view: [n],
            computing: null,
            hasLock: true,
            asking: false,
            taken: false,
            life: 0,
            epoch: 0,
          }
        : {
            status: "off",
            view: null,
            computing: null,
            hasLock: false,
            asking: false,
            taken: false,
            life: 0,
            epoch: 0,
          },
    ]),
  )
  const get = (n: number) => runners.get(n)!
  const packets: Array<Packet> = []
  const touches: Array<{ table: Table; at: number }> = []
  // When each runner's reread lands and it works out the owner again
  const rereads: Array<{ runner: number; at: number }> = []
  const snapshots: Array<{ t: number; state: State }> = []

  const queue: Array<Event> = []
  const at = (event: Event) => {
    const i = queue.findIndex((e) => e.t > event.t)
    queue.splice(i === -1 ? queue.length : i, 0, event)
  }
  const send = (
    runner: number,
    start: number,
    up: boolean,
    table: Table,
    label: string,
    tone?: Packet["tone"],
  ) =>
    packets.push({
      key: `${runner}-${label}-${start}`,
      start,
      runner,
      up,
      table,
      label,
      ...(tone && { tone }),
    })

  // The other runners reread the list at `when`, and every POLL_EVERY after
  const reanchor = (except: number, when: number) => {
    for (const [n, r] of runners) {
      if (n === except || r.status !== "running") continue
      r.epoch++
      at({ t: when, kind: "poll", runner: n, epoch: r.epoch })
    }
  }

  // Act on the last list read: ask for the lock or let go of it
  const reconcile = (n: number, t: number) => {
    const r = get(n)
    if (r.status !== "running" || !r.view) return
    const mine = ownerOf(r.view) === n
    if (mine && !r.hasLock && !r.asking) {
      r.asking = true
      r.taken = false
      send(n, t + 0.2, true, "locks", "lock?")
      at({ t: t + 0.2 + TRIP, kind: "ask", runner: n, life: r.life })
    }
    if (!mine) r.taken = false
    if (!mine && r.hasLock) {
      r.hasLock = false
      send(n, t + 0.3, true, "locks", "release")
      at({ t: t + 0.3 + TRIP, kind: "release", runner: n })
    }
  }

  const handle = (e: Event) => {
    const r = get(e.runner)
    const t = e.t
    switch (e.kind) {
      case "click": {
        if (r.status === "off") {
          r.status = "starting"
          r.life++
          r.epoch++
          send(e.runner, t, true, "runners", "add me", "register")
          at({ t: t + TRIP, kind: "join", runner: e.runner })
          reanchor(e.runner, t + CATCH_UP_START)
        } else if (r.status === "running") {
          // Shutting down politely: stop Dad, let go of the lock, then leave
          r.status = "stopping"
          r.life++
          r.epoch++
          r.asking = false
          r.taken = false
          let leave = t
          if (r.hasLock) {
            r.hasLock = false
            send(e.runner, t + 0.2, true, "locks", "release")
            at({ t: t + 0.2 + TRIP, kind: "release", runner: e.runner })
            leave = t + 0.3 + TRIP
          }
          send(e.runner, leave, true, "runners", "remove me", "register")
          at({ t: leave + TRIP, kind: "leave", runner: e.runner })
          reanchor(e.runner, leave + TRIP + CATCH_UP_STOP)
        }
        return
      }
      case "join":
        db.listed = [...db.listed, e.runner].sort()
        touches.push({ table: "runners", at: t })
        r.status = "running"
        at({ t: t + 0.3, kind: "poll", runner: e.runner, epoch: r.epoch })
        return
      case "leave":
        db.listed = db.listed.filter((n) => n !== e.runner)
        touches.push({ table: "runners", at: t })
        r.status = "off"
        r.view = null
        r.computing = null
        return
      case "release":
        if (db.lock === e.runner) db.lock = null
        touches.push({ table: "locks", at: t })
        return
      case "poll":
        if (r.epoch !== e.epoch || r.status !== "running") return
        send(e.runner, t, true, "runners", "runners?")
        at({ t: t + TRIP, kind: "read", runner: e.runner, epoch: e.epoch })
        at({
          t: t + POLL_EVERY,
          kind: "poll",
          runner: e.runner,
          epoch: e.epoch,
        })
        return
      case "read": {
        if (r.epoch !== e.epoch) return
        const list = [...db.listed]
        touches.push({ table: "runners", at: t })
        send(
          e.runner,
          t,
          false,
          "runners",
          list.length ? list.join(", ") : "none",
          "list",
        )
        at({
          t: t + TRIP,
          kind: "view",
          runner: e.runner,
          epoch: e.epoch,
          list,
        })
        return
      }
      case "view":
        if (r.epoch !== e.epoch) return
        rereads.push({ runner: e.runner, at: t })
        // Like Sharding, only recompute when the list has changed
        if (r.view && sameList(r.view, e.list)) {
          reconcile(e.runner, t)
          return
        }
        r.computing = e.list
        at({
          t: t + RECOMPUTE,
          kind: "computed",
          runner: e.runner,
          epoch: e.epoch,
          list: e.list,
        })
        return
      case "computed":
        if (r.epoch !== e.epoch) return
        r.view = e.list
        r.computing = null
        reconcile(e.runner, t)
        return
      case "ask": {
        if (r.life !== e.life) return
        const granted = db.lock === null || db.lock === e.runner
        if (granted) db.lock = e.runner
        touches.push({ table: "locks", at: t })
        send(
          e.runner,
          t,
          false,
          "locks",
          granted ? "yours" : "taken",
          granted ? undefined : "no",
        )
        at({
          t: t + TRIP,
          kind: "answer",
          runner: e.runner,
          life: e.life,
          granted,
        })
        return
      }
      case "answer":
        if (r.life !== e.life) return
        r.asking = false
        if (e.granted) r.hasLock = true
        else {
          r.taken = true
          at({ t: t + RETRY, kind: "retry", runner: e.runner, life: e.life })
        }
        reconcile(e.runner, t)
        return
      case "retry":
        if (r.life !== e.life) return
        reconcile(e.runner, t)
        return
    }
  }

  const snapshot = (t: number) => {
    const wanted = ownerOf(db.listed)
    let busy = db.lock !== wanted
    const views: Record<number, RunnerView> = {}
    for (const [n, r] of runners) {
      views[n] = {
        status: r.status,
        view: r.view,
        computing: r.computing,
        dad: r.hasLock,
        taken: r.taken,
      }
      if (r.status === "starting" || r.status === "stopping") busy = true
      if (r.status === "running") {
        if (r.asking || r.computing || !r.view || !sameList(r.view, db.listed))
          busy = true
        if (r.hasLock !== (n === wanted)) busy = true
      }
    }
    snapshots.push({
      t,
      state: { listed: [...db.listed], lock: db.lock, runners: views, busy },
    })
  }

  for (const c of clicks) at({ t: c.at, kind: "click", runner: c.runner })
  at({ t: 1.5, kind: "poll", runner: incumbent, epoch: 0 })
  snapshot(-Infinity)
  while (queue.length > 0 && queue[0]!.t <= horizon) {
    const event = queue.shift()!
    handle(event)
    snapshot(event.t)
  }

  return {
    ownerOf,
    packets,
    touches,
    rereads,
    stateAt: (time: number) => {
      let state = snapshots[0]!.state
      for (const s of snapshots) {
        if (s.t > time) break
        state = s.state
      }
      return state
    },
  }
}

type Box = { x: number; y: number; w: number; h: number }

type Layout = {
  width: number
  height: number
  cardX: number
  cardW: number
  cardH: number
  cardGap: number
  headerY: number
  // Inside a card
  belief: Box
  // The rows of the runner's state table, inside the belief box
  stateRowY: number
  stateRowH: number
  stateRowGap: number
  stateValueX: number
  slot: Box
  dadY: number
  db: Box
  runnersTitleY: number
  rowY: number
  rowH: number
  rowGap: number
  locksTitleY: number
  lockRow: Box
  // Narrow: the lock row stacks the padlock over the chip
  narrow: boolean
}

const wide: Layout = {
  width: 680,
  height: 306,
  cardX: 2,
  cardW: 328,
  cardH: 140,
  cardGap: 22,
  headerY: 26,
  belief: { x: 12, y: 44, w: 190, h: 84 },
  stateRowY: 22,
  stateRowH: 26,
  stateRowGap: 5,
  stateValueX: 80,
  slot: { x: 212, y: 44, w: 104, h: 84 },
  dadY: 46,
  db: { x: 450, y: 2, w: 228, h: 302 },
  runnersTitleY: 62,
  rowY: 76,
  rowH: 30,
  rowGap: 6,
  locksTitleY: 188,
  lockRow: { x: 12, y: 202, w: 204, h: 84 },
  narrow: false,
}

const compact: Layout = {
  width: 360,
  height: 410,
  cardX: 2,
  cardW: 170,
  cardH: 194,
  cardGap: 20,
  headerY: 22,
  belief: { x: 8, y: 34, w: 154, h: 76 },
  stateRowY: 22,
  stateRowH: 22,
  stateRowGap: 4,
  stateValueX: 72,
  slot: { x: 8, y: 116, w: 154, h: 70 },
  dadY: 40,
  db: { x: 226, y: 2, w: 132, h: 406 },
  runnersTitleY: 58,
  rowY: 70,
  rowH: 28,
  rowGap: 6,
  locksTitleY: 200,
  lockRow: { x: 8, y: 214, w: 116, h: 110 },
  narrow: true,
}

const cardTop = (L: Layout, n: number) =>
  L.cardX + RUNNERS.indexOf(n as 1 | 2) * (L.cardH + L.cardGap)
const rowTop = (L: Layout, i: number) =>
  L.db.y + L.rowY + i * (L.rowH + L.rowGap)
// Where messages meet each table
const tableY = (L: Layout, table: Table) =>
  table === "runners"
    ? rowTop(L, 0) + (2 * L.rowH + L.rowGap) / 2
    : L.db.y + L.lockRow.y + L.lockRow.h / 2

export function ShardHandoff({ both }: { both: number }) {
  // The other runner starts out alone, so starting `both` moves the shard
  const incumbent = RUNNERS.find((n) => n !== both)!
  const id = useId()
  const playback = useAnimationPlayback(FOREVER)
  const {
    time,
    clock,
    figure,
    playing,
    compact: isCompact,
    reducedMotion,
  } = playback
  const [clicks, setClicks] = useState<ReadonlyArray<Click>>([])
  // With reduced motion the clock doesn't run, so each click skips ahead to
  // where things have settled.
  const [skip, setSkip] = useState(0)
  const now = time + skip
  const sim = useMemo(
    () => simulate(clicks, now + 0.5, incumbent, both),
    [clicks, now, incumbent, both],
  )
  const s = sim.stateAt(now)
  const L = isCompact ? compact : wide

  const toggle = (n: number) => {
    if (s.busy) return
    setClicks((old) => [...old, { at: now, runner: n }])
    if (reducedMotion) setSkip((old) => old + 100)
    else if (!playing) playback.toggle()
  }
  const restart = () => {
    playback.restart()
    setClicks([])
    setSkip(0)
  }

  // What each runner worked out from its last read, kept while it stops
  const says = RUNNERS.map((n) => {
    const r = s.runners[n]!
    return r.view ? sim.ownerOf(r.view) : undefined
  })
  // Only running runners count when comparing
  const beliefs = RUNNERS.map((n, i) =>
    s.runners[n]!.status === "running" ? says[i] : undefined,
  )
  const compared = beliefs.every((b) => b !== undefined)
  const disagree = compared && beliefs[0] !== beliefs[1]

  return (
    <AnimationFrame
      ref={figure}
      className="hk"
      data-running={playback.running}
      aria-label={`Shard ${SHARD} changing hands as runners start and stop`}
    >
      <p className="hk-hint" aria-live="polite">
        {s.busy ? "Handing off…" : "Click a runner to start or stop it"}
      </p>

      <svg
        className="hk-svg"
        viewBox={`0 0 ${L.width} ${L.height}`}
        aria-labelledby={`${id}-title ${id}-desc`}
      >
        <title
          id={`${id}-title`}
        >{`Two runners and the database, handing off shard ${SHARD}`}</title>
        <desc id={`${id}-desc`}>
          {`Runner ${incumbent} starts out alone and runs Dad in shard ${SHARD}. When Runner ${both} starts, it adds itself to cluster_runners, rereads the list first and asks for the lock, but Runner ${incumbent} still holds it, so it's refused. Once Runner ${incumbent} rereads the list, it stops Dad and releases the lock, and Runner ${both} takes it and starts Dad. Stopping a runner releases its lock and removes it from the list.`}
        </desc>

        {RUNNERS.map((n) => (
          <RunnerCard
            key={n}
            L={L}
            n={n}
            r={s.runners[n]!}
            says={says[RUNNERS.indexOf(n)]}
            alert={disagree}
            busy={s.busy}
            onToggle={() => toggle(n)}
            refreshed={recent(
              sim.rereads.filter((x) => x.runner === n),
              now,
            )}
          />
        ))}
        <Database L={L} s={s} now={now} touches={sim.touches} />
        {!reducedMotion && (
          <Packets
            L={L}
            packets={sim.packets}
            now={now}
            clock={clock}
            skip={skip}
          />
        )}
      </svg>

      <AnimationControls
        playing={playing}
        onRestart={restart}
        onToggle={playback.toggle}
      />
    </AnimationFrame>
  )
}

const statusLabel: Record<Status, string> = {
  off: "stopped",
  running: "running",
  starting: "starting…",
  stopping: "stopping…",
}

// One runner: its name and whether it's on, which runner it thinks owns the
// shard, and the slot where Dad runs while it holds the lock. Clicking it
// starts or stops it.
function RunnerCard({
  L,
  n,
  r,
  says,
  alert,
  busy,
  onToggle,
  refreshed,
}: {
  L: Layout
  n: number
  r: RunnerView
  says: number | null | undefined
  alert: boolean
  busy: boolean
  onToggle: () => void
  refreshed: number | undefined
}) {
  const x = L.cardX
  const y = cardTop(L, n)
  const on = r.status === "running" || r.status === "starting"
  const off = r.status === "off"
  // One width for every status, so the pill doesn't jump as it changes
  const pillW = L.narrow ? 60 : 76
  const pillX = x + L.cardW - (L.narrow ? 8 : 10) - pillW
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") return
    event.preventDefault()
    onToggle()
  }
  const belief = { ...L.belief, x: x + L.belief.x, y: y + L.belief.y }
  const slot = { ...L.slot, x: x + L.slot.x, y: y + L.slot.y }
  const slotCx = slot.x + slot.w / 2
  return (
    <g
      role="button"
      tabIndex={0}
      aria-disabled={busy}
      aria-label={`${on ? "Stop" : "Start"} Runner ${n}`}
      className={`hk-runner ${busy ? "is-busy" : ""}`}
      onClick={onToggle}
      onKeyDown={onKey}
    >
      <rect
        x={x}
        y={y}
        width={L.cardW}
        height={L.cardH}
        rx="12"
        className={`hk-card ${off ? "is-off" : ""}`}
      />
      <g className={`hk-c${n} ${off ? "hk-dim" : ""}`}>
        <circle
          cx={x + 18}
          cy={y + L.headerY - 4.5}
          r="4.5"
          className="hk-dot"
        />
        <text x={x + 28} y={y + L.headerY} className="hk-runner-name">
          Runner {n}
        </text>
      </g>
      <g className={`hk-pill ${r.status === "running" ? "is-on" : ""}`}>
        <rect
          x={pillX}
          y={y + L.headerY - 16}
          width={pillW}
          height="22"
          rx="11"
        />
        <text
          x={pillX + pillW / 2}
          y={y + L.headerY - 5}
          dy="0.35em"
          textAnchor="middle"
        >
          {statusLabel[r.status]}
        </text>
      </g>

      {off ? (
        <text
          x={x + L.cardW / 2}
          y={y + (L.headerY + L.cardH) / 2}
          dy="0.35em"
          textAnchor="middle"
          className="hk-off"
        >
          Click to start
        </text>
      ) : (
        <>
          <rect
            x={belief.x}
            y={belief.y}
            width={belief.w}
            height={belief.h}
            rx="8"
            className={`hk-belief ${alert && says !== undefined ? "is-alert" : ""}`}
          />
          {refreshed !== undefined && (
            <rect
              key={`refresh-${refreshed}`}
              x={belief.x}
              y={belief.y}
              width={belief.w}
              height={belief.h}
              rx="8"
              className="hk-flash"
            />
          )}
          <text x={belief.x + 10} y={belief.y + 14} className="hk-pane-label">
            State
          </text>
          <StateTable
            L={L}
            box={belief}
            view={r.view}
            computing={r.computing}
            owner={says}
            starting={r.status === "starting"}
          />

          <rect
            x={slot.x}
            y={slot.y}
            width={slot.w}
            height={slot.h}
            rx="8"
            className="hk-slot"
          />
          <text x={slot.x + 10} y={slot.y + 14} className="hk-pane-label">
            Entities
          </text>
          <Dad x={slotCx} y={slot.y + L.dadY} on={r.dad} />
          {r.taken && (
            <g className="hk-pop hk-shake">
              <rect
                x={slotCx - 30}
                y={slot.y + slot.h / 2 - 13}
                width="60"
                height="26"
                rx="13"
                className="hk-no"
              />
              <text
                x={slotCx}
                y={slot.y + slot.h / 2}
                dy="0.35em"
                textAnchor="middle"
                className="hk-no-text"
              >
                ✕ taken
              </text>
            </g>
          )}
        </>
      )}
    </g>
  )
}

// The two tables cluster keeps. A table flashes when a runner reads or
// writes it.
function Database({
  L,
  s,
  now,
  touches,
}: {
  L: Layout
  s: State
  now: number
  touches: ReadonlyArray<{ table: Table; at: number }>
}) {
  const { x, y, w, h } = L.db
  const flash = (table: Table) =>
    recent(
      touches.filter((t) => t.table === table),
      now,
    )
  const runnersFlash = flash("runners")
  const locksFlash = flash("locks")
  const lock = { ...L.lockRow, x: x + L.lockRow.x, y: y + L.lockRow.y }
  const tablesTop = rowTop(L, 0) - 6
  const tablesH = 2 * L.rowH + L.rowGap + 12
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="10" className="hk-db" />
      <text x={x + 12} y={y + 20} className="hk-pane-label">
        Database
      </text>

      <text x={x + 12} y={y + L.runnersTitleY} className="hk-table-name">
        cluster_runners
      </text>
      <rect
        x={x + 6}
        y={tablesTop}
        width={w - 12}
        height={tablesH}
        rx="8"
        className="hk-table"
      />
      {runnersFlash !== undefined && (
        <rect
          key={`runners-${runnersFlash}`}
          x={x + 6}
          y={tablesTop}
          width={w - 12}
          height={tablesH}
          rx="8"
          className="hk-flash"
        />
      )}
      {s.listed.length === 0 && (
        <text
          x={x + w / 2}
          y={tablesTop + tablesH / 2}
          dy="0.35em"
          textAnchor="middle"
          className="hk-empty"
        >
          no rows
        </text>
      )}
      {s.listed.map((n, i) => (
        <g key={n} className={`hk-c${n} hk-row hk-pop`}>
          <rect
            x={x + 12}
            y={rowTop(L, i)}
            width={w - 24}
            height={L.rowH}
            rx="6"
          />
          <circle
            cx={x + 26}
            cy={rowTop(L, i) + L.rowH / 2}
            r="4.5"
            className="hk-dot"
          />
          <text x={x + 36} y={rowTop(L, i) + L.rowH / 2} dy="0.35em">
            Runner {n}
          </text>
        </g>
      ))}

      <text x={x + 12} y={y + L.locksTitleY} className="hk-table-name">
        cluster_locks
      </text>
      <rect
        x={lock.x - 6}
        y={lock.y - 6}
        width={lock.w + 12}
        height={lock.h + 12}
        rx="8"
        className="hk-table"
      />
      {locksFlash !== undefined && (
        <rect
          key={`locks-${locksFlash}`}
          x={lock.x - 6}
          y={lock.y - 6}
          width={lock.w + 12}
          height={lock.h + 12}
          rx="8"
          className="hk-flash"
        />
      )}
      <LockTable L={L} lock={lock} holder={s.lock} />
    </g>
  )
}

// cluster_locks as a table: column headings, and a row for shard 276 while
// someone holds its lock. Releasing the lock deletes the row.
function LockTable({
  L,
  lock,
  holder,
}: {
  L: Layout
  lock: { x: number; y: number; w: number; h: number }
  holder: number | null
}) {
  const col = L.narrow ? 40 : 64
  const rowY = lock.y + 18
  return (
    <g>
      <text x={lock.x + 6} y={lock.y + 8} className="hk-lock-label">
        shard
      </text>
      <text x={lock.x + col} y={lock.y + 8} className="hk-lock-label">
        runner
      </text>
      {holder === null ? (
        <text
          x={lock.x + lock.w / 2}
          y={rowY + L.rowH / 2}
          dy="0.35em"
          textAnchor="middle"
          className="hk-empty"
        >
          no rows
        </text>
      ) : (
        <g key={`lock-${holder}`} className={`hk-c${holder} hk-row hk-pop`}>
          <title>{`Runner ${holder} holds the lock on shard ${SHARD}`}</title>
          <rect x={lock.x} y={rowY} width={lock.w} height={L.rowH} rx="6" />
          <text x={lock.x + 6} y={rowY + L.rowH / 2} dy="0.35em">
            {SHARD}
          </text>
          <circle
            cx={lock.x + col + 4}
            cy={rowY + L.rowH / 2}
            r="4.5"
            className="hk-dot"
          />
          <text x={lock.x + col + 14} y={rowY + L.rowH / 2} dy="0.35em">
            Runner {holder}
          </text>
        </g>
      )}
    </g>
  )
}

// Messages between the runners and the tables they read and write.
function Packets({
  L,
  packets,
  now,
  clock,
  skip,
}: {
  L: Layout
  packets: ReadonlyArray<Packet>
  now: number
  clock: MotionValue<number>
  skip: number
}) {
  const near = L.cardX + L.cardW
  const far = L.db.x
  return (
    <g>
      {packets
        .filter((p) => p.start <= now + 0.5 && p.start + TRIP >= now - 0.5)
        .map((p) => {
          const width = Math.max(40, p.label.length * 6.5 + 14)
          const inset = Math.min(width / 2, (far - near) / 4)
          // List traffic leaves the top half of a card and lock traffic the
          // bottom half, so the two don't pile up
          const cardY =
            cardTop(L, p.runner) +
            L.cardH * (p.table === "runners" ? 0.35 : 0.7)
          const dbY = tableY(L, p.table)
          return (
            <AnimationPacket
              key={p.key}
              clock={clock}
              start={p.start - skip}
              duration={TRIP}
              fromX={p.up ? near + inset : far - inset}
              fromY={p.up ? cardY : dbY}
              toX={p.up ? far - inset : near + inset}
              toY={p.up ? dbY : cardY}
              label={p.label}
              width={width}
              className={p.tone ? `hk-packet-${p.tone} hk-c${p.runner}` : ""}
            />
          )
        })}
    </g>
  )
}

// What a runner has worked out, as a small table like the database's: the
// runner list it last read, and the owner of the shard that list gives.
function StateTable({
  L,
  box,
  view,
  computing,
  owner,
  starting,
}: {
  L: Layout
  box: Box
  view: ReadonlyArray<number> | null
  computing: ReadonlyArray<number> | null
  owner: number | null | undefined
  starting: boolean
}) {
  const rowY = (i: number) =>
    box.y + L.stateRowY + i * (L.stateRowH + L.stateRowGap)
  const cy = (i: number) => rowY(i) + L.stateRowH / 2
  const keyX = box.x + 14
  const valueX = box.x + L.stateValueX
  // While recomputing, the new list is already in hand
  const list = computing ?? view
  return (
    <g>
      {[0, 1].map((i) => (
        <rect
          key={i}
          x={box.x + 6}
          y={rowY(i)}
          width={box.w - 12}
          height={L.stateRowH}
          rx="5"
          className="hk-state-row"
        />
      ))}
      <text x={keyX} y={cy(0)} dy="0.35em" className="hk-state-key">
        runners
      </text>
      {list === null ? (
        <text x={valueX} y={cy(0)} dy="0.35em" className="hk-state-empty">
          ?
        </text>
      ) : list.length === 0 ? (
        <text x={valueX} y={cy(0)} dy="0.35em" className="hk-state-empty">
          none
        </text>
      ) : (
        <g key={list.join()} className="hk-pop">
          {list.map((n, i) => (
            <g key={n} className={`hk-c${n}`}>
              <circle
                cx={valueX + 7 + i * 18}
                cy={cy(0)}
                r="7"
                className="hk-dot"
              />
              <text
                x={valueX + 7 + i * 18}
                y={cy(0)}
                dy="0.35em"
                textAnchor="middle"
                className="hk-num"
              >
                {n}
              </text>
            </g>
          ))}
        </g>
      )}

      <text x={keyX} y={cy(1)} dy="0.35em" className="hk-state-key">
        shard {SHARD}
      </text>
      {computing ? (
        <Recompute
          x={valueX + 4}
          y={cy(1)}
          list={computing}
          label={!L.narrow}
          key="computing"
        />
      ) : owner === undefined || owner === null ? (
        <text
          x={valueX}
          y={cy(1)}
          dy="0.35em"
          className="hk-state-empty"
          key={`owner-${owner}`}
        >
          {starting || owner === undefined ? "?" : "nobody"}
        </text>
      ) : (
        <g className={`hk-c${owner} hk-pop`} key={`owner-${owner}`}>
          <circle cx={valueX + 4} cy={cy(1)} r="4.5" className="hk-dot" />
          <text
            x={valueX + 13}
            y={cy(1)}
            dy="0.35em"
            className="hk-state-value"
          >
            Runner {owner}
          </text>
        </g>
      )}
    </g>
  )
}

// A runner rebuilding its ring from a new list: a small spinning ring with
// a point for each runner on it, and a label where there's room. `x` is the
// middle of the ring.
function Recompute({
  x,
  y,
  list,
  label,
}: {
  x: number
  y: number
  list: ReadonlyArray<number>
  label: boolean
}) {
  const radius = 7
  return (
    <g className="hk-pop">
      <g className="hk-spin" style={{ transformOrigin: `${x}px ${y}px` }}>
        <circle cx={x} cy={y} r={radius} className="hk-ring" />
        {list.map((n, i) => {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / list.length
          return (
            <circle
              key={n}
              cx={x + radius * Math.cos(angle)}
              cy={y + radius * Math.sin(angle)}
              r="2.5"
              className={`hk-dot hk-c${n}`}
            />
          )
        })}
      </g>
      {label && (
        <text x={x + 11} y={y} dy="0.35em" className="hk-recompute">
          computing…
        </text>
      )}
    </g>
  )
}

function Dad({ x, y, on }: { x: number; y: number; on: boolean }) {
  return (
    <g className={`hk-dad ${on ? "is-on" : ""}`} aria-hidden="true">
      <g transform={`translate(${x} ${y - 8}) scale(1.35)`}>
        <circle r="10" className="hk-dad-skin" />
        <circle r="9.2" className="hk-dad-line" />
        <path
          d="M-7.4 -4.6 Q-4 -9.6 0 -8.2 Q4 -9.6 7.4 -4.6"
          className="hk-dad-line"
        />
        <circle cx="-3.2" cy="-1.6" r="1.15" className="hk-dad-ink" />
        <circle cx="3.2" cy="-1.6" r="1.15" className="hk-dad-ink" />
        <path
          d="M-5.2 3.4 Q-2.6 1.2 0 2.8 Q2.6 1.2 5.2 3.4 Q2.6 5.6 0 4.2 Q-2.6 5.6 -5.2 3.4Z"
          className="hk-dad-ink"
        />
      </g>
      <text x={x} y={y + 22} textAnchor="middle" className="hk-dad-name">
        Dad
      </text>
    </g>
  )
}
