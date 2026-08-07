import * as Schema from "effect/Schema"

export const GitRevision = Schema.String.check(
  Schema.isPattern(/^[a-f0-9]{40}$/),
)

export const Digest = Schema.String.check(Schema.isPattern(/^[a-f0-9]{40,64}$/))

export const Manifest = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  snapshotId: Digest,
  generatedAt: Schema.DateTimeUtcFromString,
  websiteRevision: GitRevision,
  generator: Digest,
  channels: Schema.Struct({
    v3: Schema.Struct({ revision: GitRevision }),
    v4: Schema.Struct({ revision: GitRevision }),
  }),
})

export type Manifest = typeof Manifest.Type
