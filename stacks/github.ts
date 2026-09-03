import * as Alchemy from "alchemy"
import * as Cloudflare from "alchemy/Cloudflare"
import * as GitHub from "alchemy/GitHub"
import * as Config from "effect/Config"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"

const TrafficMode = Schema.Literals([
  "workers-dev",
  "routes",
  "bridge",
  "custom-domains",
])

export default Alchemy.Stack(
  "EffectWebsiteGitHub",
  {
    providers: Layer.mergeAll(Cloudflare.providers(), GitHub.providers()),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const { accountId } = yield* yield* Cloudflare.CloudflareEnvironment
    const zoneId = yield* Config.string("CLOUDFLARE_ZONE_ID")
    const trafficMode = yield* Config.string("CLOUDFLARE_TRAFFIC_MODE").pipe(
      Config.withDefault("workers-dev"),
      Effect.flatMap(Schema.decodeUnknownEffect(TrafficMode)),
      Effect.orDie,
    )

    const apiToken = yield* Cloudflare.ApiToken.AccountApiToken("ci-token", {
      name: "effect-website-ci",
      accountId,
      policies: [
        {
          effect: "allow",
          permissionGroups: ["Secrets Store Write", "Workers Scripts Write"],
          resources: {
            [`com.cloudflare.api.account.${accountId}`]: "*",
          },
        },
        {
          effect: "allow",
          permissionGroups: [
            "Dynamic URL Redirects Write",
            "Workers Routes Write",
            "Zone Read",
          ],
          resources: {
            [`com.cloudflare.api.account.${accountId}`]: {
              [`com.cloudflare.api.account.zone.${zoneId}`]: "*",
            },
          },
        },
      ],
    })

    const applicationSecrets = yield* Config.all({
      MXBAI_ADMIN_API_KEY: Config.redacted("MXBAI_ADMIN_API_KEY"),
      MXBAI_SEARCH_API_KEY: Config.redacted("MXBAI_SEARCH_API_KEY"),
      MXBAI_VECTOR_STORE_ID: Config.redacted("MXBAI_VECTOR_STORE_ID"),
      KV_REST_API_URL: Config.redacted("KV_REST_API_URL"),
      KV_REST_API_TOKEN: Config.redacted("KV_REST_API_TOKEN"),
    })
    const previewAccountId = yield* Config.string(
      "CLOUDFLARE_PREVIEW_ACCOUNT_ID",
    )
    const previewSecrets = yield* Config.all({
      CLOUDFLARE_PREVIEW_API_TOKEN: Config.redacted(
        "CLOUDFLARE_PREVIEW_API_TOKEN",
      ),
      MXBAI_PREVIEW_ADMIN_API_KEY: Config.redacted(
        "MXBAI_PREVIEW_ADMIN_API_KEY",
      ),
      MXBAI_PREVIEW_SEARCH_API_KEY: Config.redacted(
        "MXBAI_PREVIEW_SEARCH_API_KEY",
      ),
      MXBAI_PREVIEW_VECTOR_STORE_ID: Config.redacted(
        "MXBAI_PREVIEW_VECTOR_STORE_ID",
      ),
      KV_PREVIEW_REST_API_URL: Config.redacted("KV_PREVIEW_REST_API_URL"),
      KV_PREVIEW_REST_API_TOKEN: Config.redacted("KV_PREVIEW_REST_API_TOKEN"),
    })

    if (
      previewAccountId === accountId ||
      Redacted.value(previewSecrets.MXBAI_PREVIEW_ADMIN_API_KEY) ===
        Redacted.value(applicationSecrets.MXBAI_ADMIN_API_KEY) ||
      Redacted.value(previewSecrets.MXBAI_PREVIEW_SEARCH_API_KEY) ===
        Redacted.value(applicationSecrets.MXBAI_SEARCH_API_KEY) ||
      Redacted.value(previewSecrets.MXBAI_PREVIEW_VECTOR_STORE_ID) ===
        Redacted.value(applicationSecrets.MXBAI_VECTOR_STORE_ID) ||
      Redacted.value(previewSecrets.KV_PREVIEW_REST_API_URL) ===
        Redacted.value(applicationSecrets.KV_REST_API_URL) ||
      Redacted.value(previewSecrets.KV_PREVIEW_REST_API_TOKEN) ===
        Redacted.value(applicationSecrets.KV_REST_API_TOKEN)
    ) {
      yield* Effect.die(
        "Preview Cloudflare, Mixedbread, and Upstash resources must be isolated from production",
      )
    }

    const repository = {
      owner: "Effect-TS",
      repository: "website",
    }
    const productionEnvironment = yield* GitHub.Environment("production", {
      ...repository,
      name: "Production",
      deploymentBranchPolicy: { customBranchPolicies: ["main"] },
    })
    const previewEnvironment = yield* GitHub.Environment("preview", {
      ...repository,
      name: "Preview",
    })

    yield* Effect.all([
      GitHub.Secret("cloudflare-api-token", {
        ...repository,
        environment: productionEnvironment,
        name: "CLOUDFLARE_API_TOKEN",
        value: apiToken.value,
      }),
      GitHub.Secret("cloudflare-account-id", {
        ...repository,
        environment: productionEnvironment,
        name: "CLOUDFLARE_ACCOUNT_ID",
        value: Redacted.make(accountId),
      }),
      GitHub.Variable("cloudflare-traffic-mode", {
        ...repository,
        name: "CLOUDFLARE_TRAFFIC_MODE",
        value: trafficMode,
      }),
      ...Object.entries(applicationSecrets).map(([name, value]) =>
        GitHub.Secret(name.toLowerCase().replaceAll("_", "-"), {
          ...repository,
          environment: productionEnvironment,
          name,
          value,
        }),
      ),
      GitHub.Secret("cloudflare-preview-account-id", {
        ...repository,
        environment: previewEnvironment,
        name: "CLOUDFLARE_PREVIEW_ACCOUNT_ID",
        value: Redacted.make(previewAccountId),
      }),
      ...Object.entries(previewSecrets).map(([name, value]) =>
        GitHub.Secret(name.toLowerCase().replaceAll("_", "-"), {
          ...repository,
          environment: previewEnvironment,
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
      trafficMode,
    }
  }),
)
