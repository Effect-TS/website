import { useAtomSet, useAtomValue } from "@effect/atom-react"
import type * as Monaco from "@effect/monaco-editor"
import { useEffect, useImperativeHandle, useRef, type Ref } from "react"
import { themeAtom } from "@/features/playground/atoms/theme"
import {
  ChromeDevTools,
  Dracula,
} from "@/features/playground/services/monaco/themes"
import { codeAtom } from "../atoms"
import type { LessonCode } from "../model"
import { check, type CheckResult } from "../runner/check"
import { configureTypeScript, loadTypes } from "../runner/types"
import type { Phase } from "./Results"

export interface EditorHandle {
  readonly setCode: (code: string) => void
}

interface Props {
  readonly slug: string
  readonly lesson: LessonCode | null
  readonly handle: Ref<EditorHandle>
  readonly onPhase: (phase: Phase | CheckResult) => void
  readonly onPassed: () => void
  /** Reports how many boot steps finished: editor, types, first check. */
  readonly onBoot: (done: number) => void
}

const CHECK_DELAY_MS = 500

/** One Monaco editor for the whole tutorial. Lessons swap its models' text. */
export function LessonEditor({
  slug,
  lesson,
  handle,
  onPhase,
  onPassed,
  onBoot,
}: Props) {
  const host = useRef<HTMLDivElement>(null)
  const monacoRef = useRef<typeof Monaco | null>(null)
  const modelsRef = useRef<{
    readonly main: Monaco.editor.ITextModel
    readonly test: Monaco.editor.ITextModel
  } | null>(null)
  const runId = useRef(0)
  const quiet = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const saved = useAtomValue(codeAtom(slug))
  const setSaved = useAtomSet(codeAtom(slug))
  const theme = useAtomValue(themeAtom)

  const latest = useRef({
    lesson,
    saved,
    setSaved,
    onPhase,
    onPassed,
    onBoot,
    theme,
  })
  latest.current = {
    lesson,
    saved,
    setSaved,
    onPhase,
    onPassed,
    onBoot,
    theme,
  }

  const run = async () => {
    const monaco = monacoRef.current
    const models = modelsRef.current
    if (monaco === null || models === null) return
    const id = ++runId.current
    latest.current.onPhase({ _tag: "Checking" })
    let result: CheckResult
    try {
      result = await check(monaco, models.main, models.test)
    } catch (error) {
      result = { _tag: "Crashed", message: String(error) }
    }
    if (id !== runId.current) return
    latest.current.onPhase(result)
    latest.current.onBoot(3)
    if (result._tag === "Passed") latest.current.onPassed()
  }
  const runRef = useRef(run)
  runRef.current = run

  const replaceText = (model: Monaco.editor.ITextModel, text: string) => {
    quiet.current = true
    model.setValue(text)
    quiet.current = false
  }

  useImperativeHandle(handle, () => ({
    setCode: (code) => modelsRef.current?.main.setValue(code),
  }))

  useEffect(() => {
    let disposed = false
    let cleanup = () => {}

    void import("@effect/monaco-editor").then(async (monaco) => {
      const element = host.current
      if (disposed || element === null) return
      monacoRef.current = monaco
      latest.current.onBoot(1)
      configureTypeScript(monaco)
      monaco.editor.defineTheme("chrome-devtools", ChromeDevTools)
      monaco.editor.defineTheme("dracula", Dracula)

      const main = monaco.editor.createModel(
        "",
        "typescript",
        monaco.Uri.parse("file:///main.ts"),
      )
      const test = monaco.editor.createModel(
        "",
        "typescript",
        monaco.Uri.parse("file:///main.test.ts"),
      )
      modelsRef.current = { main, test }

      const editor = monaco.editor.create(element, {
        model: main,
        theme: latest.current.theme === "dark" ? "dracula" : "chrome-devtools",
        automaticLayout: true,
        fixedOverflowWidgets: true,
        fontSize: 16,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
      })

      const change = main.onDidChangeContent(() => {
        if (quiet.current) return
        const { lesson, setSaved } = latest.current
        if (lesson === null) return
        const value = main.getValue()
        setSaved(value === lesson.main ? "" : value)
        clearTimeout(timer.current)
        timer.current = setTimeout(() => void runRef.current(), CHECK_DELAY_MS)
      })
      editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
        () => void runRef.current(),
      )

      cleanup = () => {
        change.dispose()
        editor.dispose()
        main.dispose()
        test.dispose()
        modelsRef.current = null
        monacoRef.current = null
      }

      latest.current.onPhase({ _tag: "Loading" })
      await loadTypes(monaco)
      latest.current.onBoot(2)
      if (!disposed) mountLesson()
    })

    return () => {
      disposed = true
      clearTimeout(timer.current)
      cleanup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const mountLesson = () => {
    const models = modelsRef.current
    const { lesson, saved } = latest.current
    if (models === null || lesson === null) return
    clearTimeout(timer.current)
    runId.current++
    replaceText(models.main, saved === "" ? lesson.main : saved)
    replaceText(models.test, lesson.test)
    void runRef.current()
  }

  useEffect(() => {
    if (lesson === null) {
      latest.current.onPhase({ _tag: "Loading" })
      return
    }
    mountLesson()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, lesson])

  useEffect(() => {
    monacoRef.current?.editor.setTheme(
      theme === "dark" ? "dracula" : "chrome-devtools",
    )
  }, [theme])

  return <div ref={host} className="min-h-0 flex-1" />
}
