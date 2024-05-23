import React from "react"
import { SolveButton } from "./solve-button"

export declare namespace Toolbar {
  export interface Props {}
}

export const Toolbar: React.FC<Toolbar.Props> = () => {
  return (
    <div className="w-full px-4 flex flex-col items-start justify-between sm:flex-row sm:items-center sm:space-y-0 md:h-16">
      <div className="w-full ml-auto flex space-x-2 sm:justify-start">
        <div className="hidden space-x-2 md:flex">
          <SolveButton />
        </div>
      </div>
    </div>
  )
}

Toolbar.displayName = "Toolbar"