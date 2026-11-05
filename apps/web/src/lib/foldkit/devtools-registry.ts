/**
 * Foldkit shows one DevTools overlay per page: starting a second one removes
 * the first. This registry lets every app register, and keeps exactly one
 * overlay mounted for the selected app. It lives on `globalThis` because the
 * Astro toolbar and the page load separate copies of this module.
 */
/** What the overlay's app dropdown needs. */
export interface AppChoices {
  readonly items: ReadonlyArray<{ readonly id: number; readonly name: string }>
  readonly selectedId: number
  readonly select: (id: number) => void
}

export interface RegisteredApp {
  readonly id: number
  readonly name: string
  readonly mount: (choices: AppChoices) => void
  readonly unmount: () => void
}

export interface DevToolsRegistry {
  readonly apps: () => ReadonlyArray<RegisteredApp>
  readonly selectedId: () => number | null
  readonly register: (app: Omit<RegisteredApp, "id">) => () => void
  readonly select: (id: number) => void
  readonly subscribe: (listener: () => void) => () => void
}

const KEY = Symbol.for("effect-website/foldkit/devtools-registry")

const make = (): DevToolsRegistry => {
  const apps: Array<RegisteredApp> = []
  const listeners = new Set<() => void>()
  let nextId = 1
  let selected: RegisteredApp | null = null
  const notify = () => listeners.forEach((listener) => listener())

  const activate = (app: RegisteredApp | null) => {
    if (selected === app) {
      return
    }
    selected?.unmount()
    selected = app
    mountSelected()
    notify()
  }

  const mountSelected = () => {
    selected?.mount({
      items: apps.map(({ id, name }) => ({ id, name })),
      selectedId: selected.id,
      select: (id) => queueMicrotask(() => api.select(id)),
    })
  }

  const remountSelected = () => {
    if (selected !== null) {
      selected.unmount()
      mountSelected()
    }
  }

  const api: DevToolsRegistry = {
    apps: () => apps,
    selectedId: () => selected?.id ?? null,
    register: (app) => {
      const registered = { ...app, id: nextId++ }
      apps.push(registered)
      if (selected === null) {
        activate(registered)
      } else {
        remountSelected()
        notify()
      }
      return () => {
        apps.splice(apps.indexOf(registered), 1)
        if (selected === registered) {
          selected = null
          registered.unmount()
          activate(apps[0] ?? null)
        } else {
          remountSelected()
        }
        notify()
      }
    },
    select: (id) => {
      const app = apps.find((candidate) => candidate.id === id)
      if (app !== undefined) {
        activate(app)
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
