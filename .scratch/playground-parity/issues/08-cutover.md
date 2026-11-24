# 08: Cutover: `/scratchpad` replaces `/play`

Type: task
Status: ready-for-human
Blocked by: 01, 02, 03, 04, 05, 06, 07
Spec: ../spec.md

Only when the user says so.

- [ ] `/play` serves the Scratchpad; old `/play` links and share hashes keep working; `/scratchpad` redirects
- [ ] Autosave key: read the old `/play` autosave once if the Scratchpad has none
- [ ] Remove the Playground code that nothing uses any more
- [ ] Production checks (user): the COEP `_headers` entry for the LSP worker on a deploy; make the real-Container CI job required
