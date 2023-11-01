import {FC, ReactNode} from 'react'

export const Card: FC<{children: ReactNode}> = ({children}) => {
  return (
    <div className="relative p-px overflow-hidden rounded-[2rem] bg-gradient-to-br from-white to-zinc-600">
      <div className="rounded-[31px] overflow-hidden p-1.5 bg-gradient-to-br from-zinc-400 to-zinc-700">
        <div className="rounded-[25px] overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-950 shadow-lg">{children}</div>
      </div>
    </div>
  )
}
