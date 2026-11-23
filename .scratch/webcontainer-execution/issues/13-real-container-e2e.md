# 13: Real-Container Playwright suite and CI job

Type: task
Status: ready-for-agent
Blocked by: 08, 09, 10
Spec: ../spec.md

Add a Chromium Playwright suite that runs against a real WebContainer.

- [ ] Boot, install, and types arriving with no diagnostics for the seed
- [ ] A Run produces the expected output, and editing triggers a re-run
- [ ] Introducing a type error skips the Run with the reason shown
- [ ] `pnpm add <small pkg>` through the host spawn API syncs `package.json` and `pnpm-lock.yaml` back, reloads types, and an import of the package resolves with no diagnostics
- [ ] A legacy v4 share loads and runs
- [ ] A separate, non-blocking CI job with retries and traces on failure, plus notes on how to promote it to gating
