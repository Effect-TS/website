import { useAtomSet } from "@effect/atom-react"
import { useMemo, useState, useSyncExternalStore } from "react"
import { CodeEditor } from "../playground"
import { ConfirmDialog } from "../playground/components/confirm-dialog"
import { ToolbarButton } from "../playground/components/toolbar-button"
import { useWorkspaceHandle } from "../playground/context/workspace"
import { makeLessonWorkspace, type LessonFiles } from "./workspace"

const wideScreen = "(min-width: 64rem)"

function subscribeToWideScreen(onChange: () => void) {
  const query = window.matchMedia(wideScreen)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

/**
 * The playground with the lesson's pinned workspace. On narrow screens it only
 * mounts when the learner opened the lesson in the playground (`always`), so
 * reading on a phone never boots a WebContainer.
 */
export function LessonPlayground({
  files,
  always = false,
}: {
  readonly files: LessonFiles
  readonly always?: boolean
}) {
  const isWide = useSyncExternalStore(
    subscribeToWideScreen,
    () => window.matchMedia(wideScreen).matches,
  )
  const workspace = useMemo(() => makeLessonWorkspace(files), [files])
  if (!always && !isWide) {
    return null
  }
  return (
    <CodeEditor
      workspace={workspace}
      toolbar={<LessonActions files={files} />}
    />
  )
}

type Action = "solve" | "reset"

function LessonActions({ files }: { readonly files: LessonFiles }) {
  const handle = useWorkspaceHandle()
  const resetContent = useAtomSet(handle.resetContent)
  const [confirm, setConfirm] = useState<Action | undefined>(undefined)

  return (
    <>
      <ToolbarButton onClick={() => setConfirm("solve")}>Solve</ToolbarButton>
      <ToolbarButton onClick={() => setConfirm("reset")}>Reset</ToolbarButton>
      <ConfirmDialog
        open={confirm !== undefined}
        title={confirm === "solve" ? "Show the solution?" : "Reset the lesson?"}
        description={
          confirm === "solve"
            ? "This replaces your code with the lesson's solution. Your changes will be lost."
            : "This restores the lesson's starting code. Your changes will be lost."
        }
        confirmLabel={confirm === "solve" ? "Solve" : "Reset"}
        onConfirm={() =>
          resetContent(
            makeLessonWorkspace(files, { solve: confirm === "solve" }),
          )
        }
        onClose={() => setConfirm(undefined)}
      />
    </>
  )
}
