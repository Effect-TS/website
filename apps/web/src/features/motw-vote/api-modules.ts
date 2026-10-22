import { getCollection } from "astro:content"
import * as Array from "effect/Array"
import { pipe } from "effect/Function"
import * as Order from "effect/Order"
import type { ModuleRef } from "./domain"

export const getApiModules = async (
  version = "v4",
): Promise<ReadonlyArray<ModuleRef>> =>
  pipe(
    await getCollection("apiReference", ({ data }) => data.version === version),
    Array.map(({ data }): ModuleRef => {
      const segments = data.modulePath.split("/")
      return {
        id: `${data.packageSlug}/${data.modulePath}`,
        pkg: [data.packageName, ...segments.slice(0, -1)].join("/"),
        name: segments.at(-1) ?? data.modulePath,
      }
    }),
    Array.sort(
      Order.combine(
        Order.mapInput(Order.String, (module: ModuleRef) => module.name),
        Order.mapInput(Order.String, (module: ModuleRef) => module.pkg),
      ),
    ),
  )
