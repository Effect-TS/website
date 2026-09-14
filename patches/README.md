# Dependency patches

Effect is pinned to `4.0.0-rc.115` in the workspace catalog.

Alchemy `2.0.0-beta.77` and Distilled `1.0.0-rc.9` still call Effect's old config and CLI constructors. Their patches update those calls to the RC API, including `Config.String`, `Config.Redacted`, `Flag.String`, `Argument.String`, `GlobalFlag.Setting`, and `Config.mapEffect`. Both source and compiled files need the changes because development and CLI execution use different exports. Remove these patches when upstream packages adopt the renamed APIs.

Alchemy and `@alchemy.run/frontend-frameworks` now include the `prerenderEnvironment` support previously patched into `2.0.0-beta.72`. The site still uses Node for prerendering.

The existing `astro-tweet` patch is independent of the Effect upgrade.
