// node run.mjs <chromium|firefox|webkit> [port]  (serve.mjs must be running)
import * as fs from "node:fs"
import * as path from "node:path"
import * as pw from "../../../../node_modules/playwright/index.mjs"
const here = path.dirname(new URL(import.meta.url).pathname)
const name = process.argv[2] ?? "chromium"
const port = process.argv[3] ?? "5182"
const query = process.env.QUERY ?? ""
const tag = query ? `${name}-${query.replace(/\W/g, "")}` : name
const executablePath = process.env.BROWSER_PATH || undefined
const browser = await pw[name].launch({
  headless: true,
  ...(executablePath ? { executablePath } : {}),
})
const page = await browser.newPage()
page.on("console", (m) => console.log(`[${name}] ${m.text()}`))
page.on("pageerror", (e) => console.log(`[${name}] PAGEERROR ${e.message}`))
const t0 = Date.now()
await page.goto(`http://localhost:${port}/${query ? "?" + query : ""}`)
let results
try {
  await page.waitForFunction(() => window.__results?.done === true, null, {
    timeout: 15 * 60_000,
    polling: 1000,
  })
} catch (e) {
  console.log(`[${name}] timed out: ${e.message}`)
}
results = await page.evaluate(() => window.__results)
results.wallMs = Date.now() - t0
fs.writeFileSync(
  path.join(here, "results", `${tag}.json`),
  JSON.stringify(results, null, 2),
)
console.log(
  `[${name}] wrote results/${tag}.json error=${results.error ?? "none"}`,
)
await browser.close()
