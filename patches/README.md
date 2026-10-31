# Dependency patches

Effect is pinned to `4.0.0` in the workspace catalog.

Alchemy `2.0.0-beta.80` and its Distilled dependencies support stable Effect 4 without local patches.

The existing `astro-tweet` patch is independent of the Effect upgrade.

The `@alchemy.run/frontend-frameworks` patch applies to the pinned preview build of the Astro source provider. With `workspaces: "auto"`, a deploy re-hashes the workspaces the previous build recorded and fails when one has since moved or been deleted. The patch hashes a missing workspace as changed, so the deploy rebuilds and records the workspaces the new build imports.
