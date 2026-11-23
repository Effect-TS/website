# 12: Share and autosave in the Scratchpad

Type: task
Status: ready-for-agent
Blocked by: 06, 11
Spec: ../spec.md

Add Share and autosave to the Scratchpad.

- [ ] A Share action that compresses the Workspace in the shared format, POSTs to `/api/playground/shorten`, and copies `/scratchpad#<hash>`
- [ ] A share made in the Scratchpad opens on `/play`, and the reverse
- [ ] Autosave to a Scratchpad-specific localStorage key every couple of seconds, skipping writes when nothing has changed from the seed or the import
- [ ] `pnpm-lock.yaml` and `package.json` are included in shares and autosave
- [ ] Round-trip unit tests
