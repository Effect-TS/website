import { FC, PropsWithChildren } from "react"

export const CodeOutput: FC<PropsWithChildren<{ output: string }>> = ({
  children,
  output
}) => {
  return (
    <div className="code-output">
      {children}
      <div className="p-px pt-0 bg-gradient-to-r from-zinc-700 to-zinc-800 rounded-b-xl">
        <div
          className="bg-zinc-950 rounded-b-[11px] p-4 font-mono text-sm text-zinc-800 dark:text-zinc-300"
          dangerouslySetInnerHTML={{
            __html: output.replaceAll("\n", "<br/>")
          }}
        />
      </div>
    </div>
  )
}
