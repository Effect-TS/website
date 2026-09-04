import { expect, test } from "playwright/test"

test.beforeEach(async ({ page }) => {
  await page.goto("/play", { waitUntil: "domcontentloaded" })
  await page.waitForFunction(() =>
    document.body.innerText.includes("Found 0 errors"),
  )
})

test("preserves rapid completion edits, undo, redo, and file switching", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const monacoUrl: string = "/@id/@effect/monaco-editor"
    const monaco: typeof import("@effect/monaco-editor") = await import(
      monacoUrl
    )
    const editor = monaco.editor.getEditors()[0]
    const model = editor?.getModel()
    if (editor === undefined || model === null || model === undefined) {
      throw new Error("The playground Monaco editor did not initialize")
    }

    let setValueCalls = 0
    const setValue = model.setValue.bind(model)
    model.setValue = (content) => {
      setValueCalls++
      setValue(content)
    }

    editor.executeEdits("autocomplete", [
      {
        forceMoveMarkers: true,
        range: new monaco.Range(1, 1, 1, 1),
        text: "// completion-import\n",
      },
      {
        forceMoveMarkers: true,
        range: new monaco.Range(
          model.getLineCount(),
          model.getLineMaxColumn(model.getLineCount()),
          model.getLineCount(),
          model.getLineMaxColumn(model.getLineCount()),
        ),
        text: "\n// completion-value",
      },
    ])
    editor.trigger("file-sync-test", "undo", undefined)
    editor.trigger("file-sync-test", "redo", undefined)

    for (let index = 0; index < 5; index++) {
      const line = model.getLineCount()
      const column = model.getLineMaxColumn(line)
      editor.executeEdits("rapid-edit", [
        {
          forceMoveMarkers: true,
          range: new monaco.Range(line, column, line, column),
          text: `\n// rapid-${index}`,
        },
      ])
      await new Promise((resolve) => setTimeout(resolve, 2_050))
    }
    await new Promise((resolve) => setTimeout(resolve, 3_000))

    return {
      content: model.getValue(),
      setValueCalls,
    }
  })

  expect(result.setValueCalls).toBe(0)
  expect(result.content).toContain("completion-import")
  expect(result.content).toContain("completion-value")
  for (let index = 0; index < 5; index++) {
    expect(result.content).toContain(`rapid-${index}`)
  }

  await page.getByText("DevTools.ts", { exact: true }).first().click()
  await expect(page.locator("[data-selected=true]")).toContainText(
    "DevTools.ts",
  )
  await page.getByText("main.ts", { exact: true }).first().click()
  await expect(page.locator("[data-selected=true]")).toContainText("main.ts")

  const contentAfterSwitch = await page.evaluate(async () => {
    const monacoUrl: string = "/@id/@effect/monaco-editor"
    const monaco: typeof import("@effect/monaco-editor") = await import(
      monacoUrl
    )
    return monaco.editor
      .getModel(monaco.Uri.file("playground-v4/src/main.ts"))
      ?.getValue()
  })
  expect(contentAfterSwitch).toBe(result.content)
})

test("discards a queued edit when the workspace resets", async ({ page }) => {
  await page.evaluate(async () => {
    const monacoUrl: string = "/@id/@effect/monaco-editor"
    const monaco: typeof import("@effect/monaco-editor") = await import(
      monacoUrl
    )
    const editor = monaco.editor.getEditors()[0]
    const model = editor?.getModel()
    if (editor === undefined || model === null || model === undefined) {
      throw new Error("The playground Monaco editor did not initialize")
    }
    const line = model.getLineCount()
    const column = model.getLineMaxColumn(line)
    editor.executeEdits("reset-race", [
      {
        forceMoveMarkers: true,
        range: new monaco.Range(line, column, line, column),
        text: "\n// must-not-return",
      },
    ])
  })

  await page.getByRole("button", { name: "Reset", exact: true }).first().click()
  await page.getByRole("button", { name: "Reset", exact: true }).last().click()
  await page.waitForTimeout(4_000)

  const content = await page.evaluate(async () => {
    const monacoUrl: string = "/@id/@effect/monaco-editor"
    const monaco: typeof import("@effect/monaco-editor") = await import(
      monacoUrl
    )
    return monaco.editor.getEditors()[0]?.getValue()
  })
  expect(content).not.toContain("must-not-return")
})
