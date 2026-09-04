import { writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

const output = fileURLToPath(
  new URL("../.alchemy-build-input.json", import.meta.url),
)

await writeFile(
  output,
  `${JSON.stringify({
    PUBLIC_POSTHOG_API_HOST: process.env.PUBLIC_POSTHOG_API_HOST ?? "",
    PUBLIC_POSTHOG_KEY: process.env.PUBLIC_POSTHOG_KEY ?? "",
    PUBLIC_WEBSITE_REVISION: process.env.PUBLIC_WEBSITE_REVISION ?? "local",
  })}\n`,
)
