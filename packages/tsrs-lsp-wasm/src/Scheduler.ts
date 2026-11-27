/**
 * How the host schedules background work (`lsp_tick` when the server has queued tasks, and server timers).
 * Injectable so tests can run ticks deterministically.
 */
export interface Scheduler {
  /** Runs `callback` after `ms` milliseconds (0: as soon as the event loop is free). Returns a cancel function. */
  readonly schedule: (callback: () => void, ms: number) => () => void
}

/** setTimeout-based; works in Workers, pages and Node. */
export const timeoutScheduler: Scheduler = {
  schedule: (callback, ms) => {
    const handle = setTimeout(callback, Math.max(0, ms))
    return () => clearTimeout(handle)
  },
}

interface Task {
  readonly at: number
  readonly seq: number
  readonly callback: () => void
}

/** A scheduler driven by hand: nothing runs until `advance` or `runPending` is called. */
export class ManualScheduler implements Scheduler {
  private time = 0
  private seq = 0
  private tasks: Array<Task> = []

  get now(): number {
    return this.time
  }

  /** Scheduled tasks, earliest first, as delays from now. */
  get pending(): Array<number> {
    return this.sorted().map((t) => t.at - this.time)
  }

  readonly schedule = (callback: () => void, ms: number) => {
    const task: Task = {
      at: this.time + Math.max(0, ms),
      seq: this.seq++,
      callback,
    }
    this.tasks.push(task)
    return () => {
      this.tasks = this.tasks.filter((t) => t !== task)
    }
  }

  /** Runs every task due now (including tasks they schedule for now). Returns how many ran. */
  runPending(): number {
    return this.advance(0)
  }

  /** Moves the clock forward by `ms`, running due tasks in order. Returns how many ran. */
  advance(ms: number): number {
    const until = this.time + ms
    let ran = 0
    for (;;) {
      const next = this.sorted()[0]
      if (next === undefined || next.at > until) break
      this.tasks = this.tasks.filter((t) => t !== next)
      this.time = Math.max(this.time, next.at)
      next.callback()
      ran++
    }
    this.time = until
    return ran
  }

  private sorted() {
    return [...this.tasks].sort((a, b) => a.at - b.at || a.seq - b.seq)
  }
}
