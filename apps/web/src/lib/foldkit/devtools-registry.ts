import { Effect, Queue, Stream } from "effect"
import type {
  DevToolsControllerEvent,
  DevToolsControllerPort,
  DevToolsControllerRequest,
  DevToolsProgramList,
  DevToolsPrograms,
} from "foldkit/devtools-host"

interface Port extends DevToolsControllerPort {
  readonly listeners: Set<(request: DevToolsControllerRequest) => void>
}

export interface RegisteredProgram {
  readonly id: number
  readonly name: string
  readonly mount: (
    programs: DevToolsPrograms,
    controller: DevToolsControllerPort,
  ) => void
  readonly unmount: () => void
}

export interface DevToolsController {
  readonly snapshot: () => { readonly isOpen: boolean }
  readonly changes: Stream.Stream<DevToolsControllerEvent>
  readonly open: () => void
  readonly close: () => void
}

export interface DevToolsRegistry {
  readonly controller: DevToolsController
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

  let isOpen = false
  let pending: DevToolsControllerRequest | null = null
  let current: Port | null = null
  const changeListeners = new Set<(event: DevToolsControllerEvent) => void>()
  const setOpen = (next: boolean) => {
    if (next !== isOpen) {
      isOpen = next
      const event: DevToolsControllerEvent = {
        _tag: next ? "Opened" : "Closed",
      }
      changeListeners.forEach((listener) => listener(event))
    }
  }
  const request = (value: DevToolsControllerRequest) => {
    if (current !== null && current.listeners.size > 0) {
      current.listeners.forEach((listener) => listener(value))
    } else {
      pending = value
    }
  }
  const makePort = (): Port => {
    const listeners = new Set<(request: DevToolsControllerRequest) => void>()
    const port: Port = {
      listeners,
      requests: Stream.callback<DevToolsControllerRequest>((queue) =>
        Effect.acquireRelease(
          Effect.sync(() => {
            const listener = (value: DevToolsControllerRequest) => {
              Queue.offerUnsafe(queue, value)
            }
            listeners.add(listener)
            if (port === current && pending !== null) {
              listener(pending)
              pending = null
            }
            return listener
          }),
          (listener) => Effect.sync(() => listeners.delete(listener)),
        ),
      ),
      report: (event) => {
        if (port === current) {
          setOpen(event._tag === "Opened")
        }
      },
    }
    return port
  }

  const controller: DevToolsController = {
    snapshot: () => ({ isOpen }),
    changes: Stream.callback<DevToolsControllerEvent>((queue) =>
      Effect.acquireRelease(
        Effect.sync(() => {
          const listener = (event: DevToolsControllerEvent) => {
            Queue.offerUnsafe(queue, event)
          }
          changeListeners.add(listener)
          return listener
        }),
        (listener) => Effect.sync(() => changeListeners.delete(listener)),
      ),
    ),
    open: () => request("Open"),
    close: () => request("Close"),
  }

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
    current = program === null ? null : makePort()
    if (program !== null && current !== null) {
      program.mount(overlayPrograms, current)
    }
    notify()
  }

  const api: DevToolsRegistry = {
    controller,
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
          current = null
          setOpen(false)
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
