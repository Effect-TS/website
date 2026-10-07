import { execFileSync } from "node:child_process"
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  type ChangelogPackage,
  groupReleases,
  releaseGroup,
  splitChangelog,
} from "@website/domain/Changelog"
import { afterEach, assert, describe, test } from "vite-plus/test"
import { generateChangelogs, loadChangelogDataset } from "../src/Changelog.ts"
import { renderChangelogHtml } from "../src/ChangelogHtml.ts"

describe("splitChangelog", () => {
  test("splits released versions and flags Major Changes", () => {
    const sections = splitChangelog(
      [
        "# @effect/sql-pg",
        "",
        "## 4.0.0",
        "",
        "### Major Changes",
        "",
        "- Breaking.",
        "",
        "## 4.0.0-rc.1",
        "",
        "### Patch Changes",
        "",
        "- Fix.",
      ].join("\n"),
    )
    assert.deepStrictEqual(
      sections.map(({ version, breaking }) => [version, breaking]),
      [
        ["4.0.0", true],
        ["4.0.0-rc.1", false],
      ],
    )
    assert.strictEqual(sections[1]?.body, "### Patch Changes\n\n- Fix.")
  })

  test("ignores headings that are not versions or sit inside code", () => {
    const sections = splitChangelog(
      ["## Unreleased", "", "## 1.0.0", "", "```md", "## 9.9.9", "```"].join(
        "\n",
      ),
    )
    assert.deepStrictEqual(
      sections.map(({ version }) => version),
      ["1.0.0"],
    )
    assert.include(sections[0]?.body, "## 9.9.9")
  })
})

describe("release groups", () => {
  test("group by phase, else by major.minor", () => {
    assert.strictEqual(releaseGroup("4.0.0-rc.117").label, "RC")
    assert.strictEqual(releaseGroup("4.0.0-beta.3").label, "Beta")
    assert.strictEqual(releaseGroup("4.0.0-alpha.1").label, "Alpha")
    assert.strictEqual(releaseGroup("0.0.0-next-20260101").label, "Next")
    assert.strictEqual(releaseGroup("0.0.0-snapshot-abc").label, "Snapshot")
    assert.strictEqual(releaseGroup("0.0.0-weird.1").label, "Pre-release")
    assert.strictEqual(releaseGroup("4.1.3").label, "4.1")
    assert.strictEqual(releaseGroup("4.1.3+build-5").label, "4.1")
  })

  test("keep first-appearance order", () => {
    const groups = groupReleases(
      [
        "4.1.0",
        "4.0.1",
        "4.0.0",
        "4.0.0-rc.2",
        "4.0.0-rc.1",
        "4.0.0-beta.1",
      ].map((version) => ({
        version,
      })),
    )
    assert.deepStrictEqual(
      groups.map(({ label, releases }) => [label, releases.length]),
      [
        ["4.1", 1],
        ["4.0", 2],
        ["RC", 2],
        ["Beta", 1],
      ],
    )
  })
})

describe("renderChangelogHtml", () => {
  test("renders Markdown, collapses dependency commit lists and keeps raw HTML as text", () => {
    const html = renderChangelogHtml(
      [
        "### Patch Changes",
        "",
        "- Fix `run`.<script>alert(1)</script> for Effect<A, E>",
        "- Updated dependencies [[`abc1234`](https://example.com/abc1234)]:",
        "  - effect@4.0.1",
      ].join("\n"),
    )
    assert.include(html, "<h3>Patch Changes</h3>")
    assert.include(html, "<code>run</code>")
    assert.include(html, "Updated dependencies:")
    assert.notInclude(html, "abc1234")
    assert.notInclude(html, "<script>")
    assert.include(html, "&#x3C;script>")
    assert.include(html, "Effect&#x3C;A, E>")
    assert.include(renderChangelogHtml("a<br/>b"), "<br>")
  })
})

describe("generateChangelogs", () => {
  const directories: Array<string> = []
  afterEach(() => {
    for (const directory of directories.splice(0)) {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  const git = (cwd: string, args: Array<string>, date?: string) =>
    execFileSync("git", args, {
      cwd,
      env: {
        ...process.env,
        // Ignore user config such as forced tag signing.
        GIT_CONFIG_GLOBAL: "/dev/null",
        GIT_CONFIG_SYSTEM: "/dev/null",
        GIT_AUTHOR_NAME: "t",
        GIT_AUTHOR_EMAIL: "t@example.com",
        GIT_COMMITTER_NAME: "t",
        GIT_COMMITTER_EMAIL: "t@example.com",
        ...(date === undefined
          ? {}
          : { GIT_COMMITTER_DATE: date, GIT_AUTHOR_DATE: date }),
      },
      stdio: "pipe",
    })

  function setup(tag: boolean) {
    const root = mkdtempSync(join(tmpdir(), "changelog-"))
    directories.push(root)
    const repository = join(root, "repo")
    const output = join(root, "out")
    const packageDirectory = join(repository, "packages", "sql", "pg")
    mkdirSync(packageDirectory, { recursive: true })
    writeFileSync(
      join(packageDirectory, "CHANGELOG.md"),
      "# @effect/sql-pg\n\n## 4.0.1\n\n### Major Changes\n\n- Break.\n\n## 4.0.0\n\n- First.\n",
    )
    git(repository, ["init", "-q"])
    git(repository, ["add", "."])
    // 23:30 at -05:00 is already the next day in UTC.
    git(
      repository,
      ["commit", "-q", "-m", "release"],
      "2026-09-20T23:30:00-05:00",
    )
    // Lightweight tag, as in the Effect v4 repository.
    if (tag) git(repository, ["tag", "@effect/sql-pg@4.0.1"])
    return {
      output,
      repository,
      source: {
        name: "@effect/sql-pg",
        version: "4.0.1",
        directory: packageDirectory,
      },
    }
  }

  test("dates releases from lightweight tags in UTC", () => {
    const { output, repository, source } = setup(true)
    generateChangelogs({
      channel: "v4",
      output,
      repository,
      revision: "abc",
      sources: [source],
    })
    const file: ChangelogPackage = JSON.parse(
      readFileSync(join(output, "changelog", "sql-pg.json"), "utf8"),
    )
    assert.deepStrictEqual(
      file.releases.map(({ version, date, breaking }) => [
        version,
        date,
        breaking,
      ]),
      [
        ["4.0.1", "2026-09-21", true],
        ["4.0.0", undefined, false],
      ],
    )
    assert.strictEqual(
      file.sourceUrl,
      "https://github.com/Effect-TS/effect/blob/abc/packages/sql/pg/CHANGELOG.md",
    )
  })

  test("loads generated data from <channel>/changelog", async () => {
    const { output, repository, source } = setup(true)
    generateChangelogs({
      channel: "v4",
      output: join(output, "v4"),
      repository,
      revision: "abc",
      sources: [source],
    })
    const entries = await loadChangelogDataset(output)
    assert.deepStrictEqual(
      entries.map(({ data }) => `${data.channel}/${data.slug}`),
      ["v4/sql-pg"],
    )
    assert.deepStrictEqual(
      await loadChangelogDataset(join(output, "missing")),
      [],
    )
  })

  test("fails when no release tag exists", () => {
    const { output, repository, source } = setup(false)
    assert.throws(
      () =>
        generateChangelogs({
          channel: "v4",
          output,
          repository,
          revision: "abc",
          sources: [source],
        }),
      /No release tags found/,
    )
  })
})
