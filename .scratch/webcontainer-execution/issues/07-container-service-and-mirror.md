# 07: Container service: boot, isolation, and one-way Workspace mirror

Type: task
Status: ready-for-agent
Blocked by: 05
Spec: ../spec.md

Add the Scratchpad's `Container` Effect service.

- [ ] `/scratchpad` sends COOP `same-origin` and COEP `require-corp` (non-prerendered like `/play`, or via `_headers`), and every tsrs asset still loads
- [ ] A `Container` service that boots WebContainer on page load, holds one instance per page, and fails with typed errors: unsupported browser, boot failed
- [ ] Mount the Workspace, then mirror `WorkspaceEvent`s one way (write, remove, rename) from the same stream that feeds the tsrs worker
- [ ] A host spawn API (`jsh`, PATH including `node_modules/.bin`) used by install, Runs and tests
- [ ] Start `/dev-tools-proxy` at boot and drop its output
- [ ] Container phases exposed as an atom for the status badge
- [ ] A fake `Container` layer for unit tests, plus mirror tests against it
