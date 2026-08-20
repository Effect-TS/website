import * as Alchemy from "alchemy"
import * as Cloudflare from "alchemy/Cloudflare"
import * as GitHub from "alchemy/GitHub"
import * as Config from "effect/Config"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"

export default Alchemy.Stack(
  "EffectWebsiteGitHub",
  {
    providers: Layer.mergeAll(Cloudflare.providers(), GitHub.providers()),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const { accountId } = yield* yield* Cloudflare.CloudflareEnvironment

    const apiToken = yield* Cloudflare.ApiToken.AccountApiToken("ci-token", {
      name: "effect-website-ci",
      accountId,
      policies: [
        {
          effect: "allow",
          permissionGroups: [
            "Account Settings Write",
            "Secrets Store Write",
            "Workers Scripts Write",
          ],
          resources: {
            [`com.cloudflare.api.account.${accountId}`]: "*",
          },
        },
        {
          effect: "allow",
          permissionGroups: [
            "DNS Write",
            "Dynamic URL Redirects Write",
            "Workers Routes Write",
          ],
          resources: {
            [`com.cloudflare.api.account.${accountId}`]: {
              "com.cloudflare.api.account.zone.*": "*",
            },
          },
        },
      ],
    })

    const applicationSecrets = yield* Config.all({
      MXBAI_ADMIN_API_KEY: Config.redacted("MXBAI_ADMIN_API_KEY"),
      MXBAI_PREVIEW_ADMIN_API_KEY: Config.redacted(
        "MXBAI_PREVIEW_ADMIN_API_KEY",
      ),
      MXBAI_SEARCH_API_KEY: Config.redacted("MXBAI_SEARCH_API_KEY"),
      MXBAI_VECTOR_STORE_ID: Config.redacted("MXBAI_VECTOR_STORE_ID"),
      KV_REST_API_URL: Config.redacted("KV_REST_API_URL"),
      KV_REST_API_TOKEN: Config.redacted("KV_REST_API_TOKEN"),
    })

    const repository = {
      owner: "Effect-TS",
      repository: "website",
    }

    yield* Effect.all([
      GitHub.Secret("cloudflare-api-token", {
        ...repository,
        name: "CLOUDFLARE_API_TOKEN",
        value: apiToken.value,
      }),
      GitHub.Secret("cloudflare-account-id", {
        ...repository,
        name: "CLOUDFLARE_ACCOUNT_ID",
        value: Redacted.make(accountId),
      }),
      ...Object.entries(applicationSecrets).map(([name, value]) =>
        GitHub.Secret(name.toLowerCase().replaceAll("_", "-"), {
          ...repository,
          name,
          value,
        }),
      ),
    ])

    const publicPosthogKey = yield* Config.option(
      Config.string("PUBLIC_POSTHOG_KEY"),
    )
    const publicPosthogApiHost = yield* Config.string(
      "PUBLIC_POSTHOG_API_HOST",
    ).pipe(Config.withDefault("https://us.i.posthog.com"))

    yield* GitHub.Variable("public-posthog-api-host", {
      ...repository,
      name: "PUBLIC_POSTHOG_API_HOST",
      value: publicPosthogApiHost,
    })
    yield* Option.match(publicPosthogKey, {
      onNone: () => Effect.void,
      onSome: (value) =>
        GitHub.Variable("public-posthog-key", {
          ...repository,
          name: "PUBLIC_POSTHOG_KEY",
          value,
        }),
    })

    return {
      apiTokenName: apiToken.name,
      repository: `${repository.owner}/${repository.repository}`,
    }
  }),
)
