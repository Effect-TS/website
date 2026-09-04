# @website/alchemy-mixedbread

Alchemy resources for Mixedbread infrastructure used by the Effect website.

## Vector stores

Register the provider and declare a store inside an Alchemy stack:

```ts
import * as Mixedbread from "@website/alchemy-mixedbread"

const store =
  yield *
  Mixedbread.VectorStore("SearchStore", {
    name: "effect-website-pr-123",
    expiresAfter: { anchor: "last_active_at", days: 7 },
  })
```

`name` and `config` changes replace the store. Description, metadata,
visibility, license, and expiration changes update it in place. Destroying the
stack deletes the store and its indexed content.

The provider reads management credentials from `MXBAI_ADMIN_API_KEY`. The key
is not part of resource props or persisted resource attributes.
