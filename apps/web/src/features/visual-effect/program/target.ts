import { Effect, MutableHashMap, MutableRef, Option } from "effect"

/**
 * A Mount creates a driver when its element enters the DOM and removes it when
 * the element leaves. A Command from `update` finds the driver and gives it
 * the new input. If no driver is there, the input is dropped: the element is
 * not rendered yet, or it is already gone.
 */
export interface Driver<Input> {
  readonly apply: (input: Input) => void
  readonly dispose: () => void
}

/** The place of a target that has one element. */
export interface Slot<Input> {
  /** The result removes the driver, unless a newer driver took the slot. */
  readonly register: (driver: Driver<Input>) => () => void
  readonly send: (input: Input) => void
}

/** The places of a target that has many elements, one per key. */
export interface Table<Key, Input> {
  /** The result removes the driver, unless a newer driver took its key. */
  readonly register: (key: Key, driver: Driver<Input>) => () => void
  readonly send: (key: Key, input: Input) => void
}

const applyTo = <Input>(
  maybeDriver: Option.Option<Driver<Input>>,
  input: Input,
): void =>
  Option.match(maybeDriver, {
    onNone: () => undefined,
    onSome: (driver) => driver.apply(input),
  })

export const makeSlot = <Input>(): Slot<Input> => {
  // NOTE: Mutable on purpose. A Mount adds a driver and a Command reaches it later, and neither can pass a value to the other.
  const current = MutableRef.make<Option.Option<Driver<Input>>>(Option.none())
  return {
    register: (driver) => {
      MutableRef.set(current, Option.some(driver))
      return () => {
        if (Option.exists(MutableRef.get(current), (held) => held === driver)) {
          MutableRef.set(current, Option.none())
        }
      }
    },
    send: (input) => applyTo(MutableRef.get(current), input),
  }
}

export const makeTable = <Key, Input>(): Table<Key, Input> => {
  // NOTE: Mutable on purpose. Same reason as in `makeSlot`.
  const drivers = MutableHashMap.empty<Key, Driver<Input>>()
  return {
    register: (key, driver) => {
      MutableHashMap.set(drivers, key, driver)
      return () => {
        if (
          Option.exists(
            MutableHashMap.get(drivers, key),
            (held) => held === driver,
          )
        ) {
          MutableHashMap.remove(drivers, key)
        }
      }
    },
    send: (key, input) => applyTo(MutableHashMap.get(drivers, key), input),
  }
}

/** Starts a driver, registers it, and removes and disposes it when the Mount ends. */
export const acquireDriver = <Driven extends { readonly dispose: () => void }>(
  start: () => Driven,
  register: (driver: Driven) => () => void,
) =>
  Effect.acquireRelease(
    Effect.sync(() => {
      const driver = start()
      return { driver, unregister: register(driver) }
    }),
    ({ driver, unregister }) =>
      Effect.sync(() => {
        unregister()
        driver.dispose()
      }),
  )
