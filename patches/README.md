# Dependency patches

Effect is pinned to `4.1.0` in the workspace catalog.

`alchemy@2.0.0-beta.80.patch` ports Alchemy's OAuth code to Effect 4.1. Effect 4.1 removed `effect/Crypto`, and Alchemy `2.0.0-beta.80` and `2.0.0-beta.84` still import it, so the deploy stack fails to load. The patch uses `effect/crypto` (`SecureRandom`, `Digest`) in `Auth/OAuthFlow`, provides both services from `Util/PlatformServices`, and updates the shipped types. Drop it when Alchemy supports Effect 4.1.

The `astro-tweet` patch is independent of the Effect upgrade.
