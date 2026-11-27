import type {
  PageToWorker,
  WorkerToPage,
} from "../../../src/features/scratchpad/worker-protocol.ts"
import type { WorkerLike } from "../../../src/features/scratchpad/worker-transport.ts"

/** A Worker stand-in: records what the page posts and lets the test speak for the worker. */
export class FakeWorker implements WorkerLike {
  readonly posted: Array<PageToWorker | string> = []
  /** The transfer list of each posted message, by index. */
  readonly transfers: Array<ReadonlyArray<Transferable> | undefined> = []
  terminated = false
  private readonly listeners = new Map<
    string,
    Array<(event: { readonly data?: unknown }) => void>
  >()

  postMessage(message: unknown, transfer?: Array<Transferable>) {
    if (this.terminated) throw new Error("posted to a terminated worker")
    this.posted.push(message as PageToWorker | string)
    this.transfers.push(transfer)
  }
  terminate() {
    this.terminated = true
  }
  addEventListener(
    type: "message" | "error" | "messageerror",
    listener: (event: { readonly data?: unknown }) => void,
  ) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener])
  }
  emit(data: WorkerToPage | string) {
    for (const listener of this.listeners.get("message") ?? []) {
      listener({ data })
    }
  }
  crash(message: string) {
    for (const listener of this.listeners.get("error") ?? []) {
      listener({ message } as { readonly data?: unknown })
    }
  }
  controls(): ReadonlyArray<PageToWorker> {
    return this.posted.filter((m): m is PageToWorker => typeof m !== "string")
  }
  strings(): ReadonlyArray<string> {
    return this.posted.filter((m): m is string => typeof m === "string")
  }
}

export const makeFakeWorkers = () => {
  const workers: Array<FakeWorker> = []
  return {
    workers,
    makeWorker: () => {
      const worker = new FakeWorker()
      workers.push(worker)
      return worker
    },
  }
}
