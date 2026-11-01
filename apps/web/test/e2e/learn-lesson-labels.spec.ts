import { expect, test } from "playwright/test"

// The course opens on the /learn landing page; there is no introductory
// lesson. Navigation shows lesson titles alone, so the first Part 1 lesson,
// whose order is 2, does not read "2. ...".
const lesson2 = "/learn/part-1/02-describe-then-run"
const lesson2Title = "Running your first Effect"

test("Part 1 opens on lesson 2 with title-only labels and a 376 minute budget", async ({
  page,
}) => {
  await page.goto("/learn")
  const first = page
    .locator('section[aria-labelledby="part-1"]')
    .getByRole("listitem")
    .first()
    .getByRole("link")
  await expect(first).toHaveAttribute("href", lesson2)
  // The title, then the lesson's minutes, with no leading number.
  await expect(first).toHaveText(
    new RegExp(`^\\s*${lesson2Title}(\\s+\\d+ min)?\\s*$`),
  )
  await expect(page.locator('a[href^="/learn/part-1/01-"]')).toHaveCount(0)
  await expect(page.locator("body")).toContainText("376 minutes")

  await page.goto(lesson2, { waitUntil: "domcontentloaded" })
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(lesson2Title)
})
