# 01: Spike: Node type-stripping runner in a real Container

Type: prototype
Status: ready-for-agent
Spec: ../spec.md

Find out whether `node src/main.ts` with Node 24 type stripping can run Scratchpad Workspaces inside a real WebContainer. Answer under `## Answer` with a recommendation: type stripping, or the fallback `tsc` emit then `node`.

- [ ] Confirm the Container's Node version and that type stripping is on by default, or which flag turns it on
- [ ] Write a resolve hook (`module.register` / `--import`) that maps relative `./x.js` imports to `./x.ts` when the `.js` file does not exist, and run a legacy Playground workspace that uses `.js` imports
- [ ] Check whether enums, namespaces or parameter properties are needed (`--experimental-transform-types`), using the v4 template and a few legacy shares
- [ ] Check that stack traces point at the right `.ts` lines, with and without `--enable-source-maps`
- [ ] Check whether `process.title` being `undefined` (webcontainer-core#2184) breaks `@effect/platform-node`
- [ ] Measure the time from an edit to the first output line, compared with `tsc` emit then `node`
- [ ] Check that killing and restarting the process releases cleanly with no orphaned children
