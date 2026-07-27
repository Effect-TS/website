# API Reference

## Goal

Publish a rich, versioned API reference at URLs such as:

```text
/docs/api/v4/effect/Effect
/docs/api/v4/effect/unstable/http/HttpClient
/docs/api/v4/platform-node/NodeHttpClient
/docs/api/v3/effect/Effect
```

The API reference is derived from TypeDoc JSON generated from Effect package exports. The complete TypeDoc representation must remain available to render signatures, overloads, comments, examples, source links, hierarchies, and future interactive components.

The website repository does not own API release state. Every website build must use the latest successfully generated dataset for each supported Effect major-version channel.

## Ownership

The Effect release system owns:

- Generating an immutable API dataset from an exact Effect Git revision.
- Publishing that dataset to durable storage.
- Atomically updating the `v3` or `v4` channel manifest after publication succeeds.
- Triggering a website rebuild after a channel is updated.

The website owns:

- Synchronizing the latest channel datasets into an ignored, ephemeral directory before a build.
- Indexing dataset manifests with an Astro content collection.
- Loading complete TypeDoc module documents on demand.
- Routing, rendering, navigation, search, and cross-module links.

No generated API data, release revision, channel lock, or package version is committed to the website repository.

## Release Data Model

Datasets are immutable and addressed by Effect Git revision:

```text
datasets/<git-sha>/api-reference.tar.zst
channels/v3.json
channels/v4.json
```

A channel manifest points to the latest complete dataset:

```json
{
  "schemaVersion": 1,
  "channel": "v4",
  "revision": "52838418db2e04db6aaed2fa01b280f2aad4032a",
  "artifact": "https://example.invalid/datasets/52838418/api-reference.tar.zst",
  "sha256": "..."
}
```

The channel pointer is updated only after its immutable artifact has been uploaded and verified. A website dispatch is a wake-up signal, not a source revision: the website always reads the latest channel pointers when its build starts.

## Dataset Layout

After synchronization, a website build sees:

```text
.data/api-reference/
  v3/
    manifest.json
    effect/
      manifest.json
      Effect.json
  v4/
    manifest.json
    effect/
      manifest.json
      Effect.json
      unstable/http/HttpClient.json
    @effect/platform-node/
      manifest.json
      NodeHttpClient.json
```

The root manifest records the dataset schema, TypeDoc versions, channel, revision, and package manifests. Each package manifest records its package version and sorted modules. Each module entry records its public export, source path, JSON path, and SHA-256 digest.

Generation must be deterministic. Manifests and module documents must not include generation timestamps.

## Astro Content Model

Raw TypeDoc JSON is canonical but is not copied into Astro's content store. The `apiReference` collection indexes package manifests and stores lightweight entries:

```ts
interface ApiReferenceEntry {
  version: "v3" | "v4"
  revision: string
  packageName: string
  packageSlug: string
  packageVersion: string
  modulePath: string
  exportPath: string
  sourcePath: string
  reflectionPath: string
  reflectionDigest: string
  typedocSchemaVersion: "2.0"
}
```

Collection identifiers follow `<version>/<package-slug>/<module-path>`, for example `v4/effect/unstable/http/HttpClient`.

Effect-scoped npm package names omit `@effect/` in URLs. The loader must reject resulting slug collisions.

The collection loader reads only manifests. Rendering code calls a central accessor to read one complete TypeDoc document, verify its path, digest, and schema version, and return the unmodified rich reflection object. This avoids placing hundreds of megabytes in Astro's global content store while preserving all TypeDoc information.

## Routing

The intended routes are:

```text
src/pages/docs/api/[version]/index.astro
src/pages/docs/api/[version]/[package]/index.astro
src/pages/docs/api/[version]/[package]/[...module].astro
```

Recommended redirects:

```text
/docs/api -> /docs/api/v4
/docs/api/v3 -> /docs/api/v3/effect
/docs/api/v4 -> /docs/api/v4/effect
```

A version switcher attempts the same package and module in the other channel, then falls back to that package's index.

## Automation

The future Effect release workflow performs these operations in order:

1. Generate the dataset from the exact release revision.
2. Verify all module files and checksums.
3. Upload an immutable compressed artifact to durable storage.
4. Atomically replace the matching major-version channel manifest.
5. Send an `api-reference-updated` repository dispatch to the website.

The website workflow uses deployment concurrency with cancellation. Every deployment, including unrelated website deployments, synchronizes current channel manifests before running Astro. Multiple or delayed dispatches therefore cannot deploy stale API data.

GitHub Actions artifacts are not durable storage because they expire. Object storage with CDN delivery is preferred; GitHub Release assets are an acceptable initial alternative.

## Local Development

Local generation substitutes for the future remote synchronization step:

```sh
pnpm api-reference:generate -- --version v4 --package effect
pnpm dev
```

The generated `.data/api-reference` directory is ignored. The content loader returns an empty collection with a warning when no local datasets are present, so unrelated website work does not require API data.

## Tasks

### Dataset Generation

- [x] Isolate TypeDoc and its supported TypeScript version from the website compiler.
- [x] Discover public packages and modules deterministically from package export maps.
- [x] Generate one complete TypeDoc JSON document per package module.
- [x] Preserve nested module paths such as `unstable/http/HttpClient`.
- [x] Add channel metadata and TypeDoc format metadata to dataset manifests.
- [x] Add SHA-256 digests to package module manifests.
- [x] Verify deterministic output for a repeated local generation.

### Astro Integration

- [x] Define the `apiReference` collection schema.
- [x] Implement a manifest-backed custom Astro loader.
- [x] Keep raw TypeDoc documents out of Astro's content store.
- [x] Implement safe, digest-checked loading of complete TypeDoc reflections.
- [x] Verify local collection synchronization with a generated v4 dataset.
- [x] Add a development-only module explorer for testing collection entries and raw reflections.

### Website Experience

- [ ] Implement version, package, and catch-all module routes.
- [ ] Implement package and nested module navigation.
- [ ] Render declarations, signatures, overloads, comments, examples, and source links.
- [ ] Implement stable declaration anchors.
- [ ] Implement the v3/v4 version switcher and fallbacks.
- [ ] Build a compact search index.
- [ ] Build a cross-module symbol index and reference-link resolver.
- [ ] Measure production build time, memory, page size, and deployment size.

### Release Infrastructure

- [ ] Choose durable artifact and channel-manifest storage.
- [ ] Move or expose dataset generation for the Effect release workflow.
- [ ] Generate and publish immutable artifacts after version-package releases.
- [ ] Update channel manifests atomically after artifact verification.
- [ ] Dispatch website rebuilds from Effect releases.
- [ ] Implement ephemeral website dataset synchronization.
- [ ] Run synchronization before every website build.
- [ ] Configure deployment concurrency to prevent stale deployments.
- [ ] Generate and test the latest v3 dataset.
- [ ] Generate and test the latest v4 dataset.
