/**
 * A Mount creates a driver when its element enters the DOM and removes it when
 * the element leaves. A Command from `update` finds the driver by id and gives
 * it the new input.
 */
export interface Driver<Input> {
  readonly apply: (input: Input) => void
  readonly dispose: () => void
}

export interface Registry<Input> {
  /** Adds a driver. The result removes it, unless a newer driver took its id. */
  readonly register: (id: string, driver: Driver<Input>) => () => void
  readonly apply: (id: string, input: Input) => void
}

export const makeRegistry = <Input>(): Registry<Input> => {
  const drivers = new Map<string, Driver<Input>>()
  return {
    register: (id, driver) => {
      drivers.set(id, driver)
      return () => {
        if (drivers.get(id) === driver) {
          drivers.delete(id)
        }
      }
    },
    apply: (id, input) => drivers.get(id)?.apply(input),
  }
}
