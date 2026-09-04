import * as Provider from "alchemy/Provider"
import * as Layer from "effect/Layer"
import { MixedbreadClientLayer } from "./Client.ts"
import * as Credentials from "./Credentials.ts"
import { VectorStoreProvider, VectorStoreRegistration } from "./VectorStore.ts"

export class Providers extends Provider.ProviderCollection<Providers>()(
  "Mixedbread",
) {}

export const providers = () =>
  Layer.effect(Providers, Provider.collection([VectorStoreRegistration])).pipe(
    Layer.provide(VectorStoreProvider),
    Layer.provideMerge(MixedbreadClientLayer),
    Layer.provideMerge(Credentials.fromEnv),
    Layer.orDie,
  )
