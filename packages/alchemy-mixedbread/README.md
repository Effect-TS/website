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
visibility, license, expiration, and tag changes update it in place. Destroying
the stack deletes the store and its indexed content.

### Copying another store

Set `copyFrom` to a store ID or name to start a new store from that store's
files and indexed chunks instead of an empty store:

```ts
const store =
  yield *
  Mixedbread.VectorStore("SearchStore", {
    name: "effect-website-pr-123",
    copyFrom: Config.Redacted("MXBAI_VECTOR_STORE_ID"),
  })
```

The copy only happens when the resource creates or recreates the store.
Changing `copyFrom` never updates or replaces an existing store. The copy keeps
the source's content, so run a full sync against it afterwards.

The provider copies only when the source's `config` matches this store's
`config`, since a copy can't change it, and when the source has no files still
processing. Otherwise, and whenever the copy fails, it deletes any failed copy
and creates an empty store instead. A copy left running by a cancelled
deployment is awaited on the next run instead of being started again.

While a copy runs, neither store accepts file changes.

from `MXBAI_ADMIN_API_KEY`. The key
is not part of resource props or persisted resource attributes.
