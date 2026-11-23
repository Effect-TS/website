# 02: Spike: copy installed declarations from the Container into the tsrs worker

Type: prototype
Status: ready-for-agent
Spec: ../spec.md

Find out the fastest reliable way to get `package.json` and `*.d.ts` files from the Container's pnpm `node_modules` into the tsrs worker's in-memory file system. Answer under `## Answer` with a chosen mechanism and measured numbers.

- [ ] Measure a naive approach: walk `node_modules/.pnpm/*/node_modules/**` and run `fs.readFile` per file, as the Playground's type acquisition does
- [ ] Measure an in-container script that packs every matching file into one archive or JSON blob, read out with one `readFile`
- [ ] Measure `export(dir, { format, includes })`, and check whether it silently drops large unread files (webcontainer-core#2180)
- [ ] Decide how pnpm symlinks are flattened so tsrs resolves `effect`, `@effect/platform-node` and `@types/node` under `/workspace/node_modules`
- [ ] Check that tsrs diagnostics are clean for the v4 template after the copy, and record the file count, bytes and time in Chromium, Firefox and WebKit
- [ ] Sketch the bulk `WorkspaceFsOp` that the worker protocol needs
