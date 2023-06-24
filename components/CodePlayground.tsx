import stackblitz, { type VM } from "@stackblitz/sdk"
import React from "react"

export const CodePlayground: React.FC<{
  repo: string
  openFile?: string
  height?: number
  className?: string
  showSidebar?: boolean
}> = ({ repo, openFile, height, className, showSidebar }) => {
  const ref = React.useRef<HTMLDivElement>(null)
  const [vm, setVm] = React.useState<VM | undefined>(undefined)

  React.useEffect(() => {
    console.log("repo", repo, ref.current, ref.current?.parentNode)
    if (ref.current && ref.current.parentNode !== null) {
      stackblitz
        .embedGithubProject(ref.current, repo, {
          openFile,
          showSidebar: true,
        })
        .then((_) => setVm(_))
    }
  }, [ref, repo, openFile])

  React.useEffect(() => {
    if (vm && showSidebar) {
      vm.editor.showSidebar()
    }
  }, [vm, showSidebar])

  return (
    <div
      className={
        "overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-900" +
        (className ? " " + className : "")
      }
      style={{
        height: height ?? 500,
      }}
    >
      <div className="h-full w-full" ref={ref} />
    </div>
  )
}
