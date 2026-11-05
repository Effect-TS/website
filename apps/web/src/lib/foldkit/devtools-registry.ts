import { Effect, Queue, Stream } from "effect"
import type {
  DevToolsProgramList,
  DevToolsPrograms,
} from "foldkit/devtools-host"

export interface RegisteredProgram {
  readonly id: number
  readonly name: string
  readonly mount: (programs: DevToolsPrograms) => void
  readonly unmount: () => void
}

export interface DevToolsRegistry {
  readonly selectedId: () => number | null
  readonly register: (program: Omit<RegisteredProgram, "id">) => () => void
  readonly select: (id: number) => void
  readonly subscribe: (listener: () => void) => () => void
}

const KEY = Symbol.for("effect-website/foldkit/devtools-registry")

const make = (): DevToolsRegistry => {
  const programs: Array<RegisteredProgram> = []
  const listeners = new Set<() => void>()
  let nextId = 1
  let selected: RegisteredProgram | null = null
  const notify = () => listeners.forEach((listener) => listener())

  const snapshot = (): DevToolsProgramList => ({
    items: programs.map(({ id, name }) => ({ id, name })),
    selectedId: selected?.id ?? -1,
  })

  const changes: Stream.Stream<DevToolsProgramList> =
    Stream.callback<DevToolsProgramList>((queue) =>
      Effect.acquireRelease(
        Effect.sync(() => {
          const listener = () => Queue.offerUnsafe(queue, snapshot())
          listeners.add(listener)
          listener()
          return listener
        }),
        (listener) => Effect.sync(() => listeners.delete(listener)),
      ),
    )

  const overlayPrograms: DevToolsPrograms = {
    snapshot,
    changes,
    select: (id) => queueMicrotask(() => api.select(id)),
  }

  const activate = (program: RegisteredProgram | null) => {
    if (selected === program) {
      return
    }
    selected?.unmount()
    selected = program
    selected?.mount(overlayPrograms)
    notify()
  }

  const api: DevToolsRegistry = {
    selectedId: () => selected?.id ?? null,
    register: (program) => {
      const registered = { ...program, id: nextId++ }
      programs.push(registered)
      if (selected === null) {
        activate(registered)
      } else {
        notify()
      }
      return () => {
        programs.splice(programs.indexOf(registered), 1)
        if (selected === registered) {
          registered.unmount()
          selected = null
          activate(programs[0] ?? null)
        }
        notify()
      }
    },
    select: (id) => {
      const program = programs.find((candidate) => candidate.id === id)
      if (program !== undefined) {
        activate(program)
      }
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
  return api
}

export const devToolsRegistry = (): DevToolsRegistry => {
  const holder = globalThis as unknown as Record<symbol, DevToolsRegistry>
  return (holder[KEY] ??= make())
}
