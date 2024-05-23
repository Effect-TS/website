import React from "react"
import { ShareButton } from "./share-button"
import { PresetSelector } from "./preset-selector"

export declare namespace Toolbar {
  export interface Props {}
}

export const Toolbar: React.FC<Toolbar.Props> = () => {
  return (
    <div className="w-full border-b dark:border-neutral-700 px-4 flex flex-col items-start justify-between sm:flex-row sm:items-center sm:space-y-0 md:h-16">
      <ToolbarHeader />

      <div className="w-full ml-auto flex space-x-2 sm:justify-end">
        <PresetSelector
          presets={[
            {
              id: "9cb0e66a-9937-465d-a188-2c4c4ae2401f",
              name: "Basic CLI"
            },
            {
              id: "61eb0e32-2391-4cd3-adc3-66efe09bc0b7",
              name: "Http Server"
            }
          ]}
        />
        <div className="hidden space-x-2 md:flex">
          <ShareButton />
        </div>
      </div>
    </div>
  )
}

Toolbar.displayName = "Toolbar"

export declare namespace ToolbarHeader {
  export interface Props {}
}

const ToolbarHeader: React.FC<ToolbarHeader.Props> = () => {
  return (
    <h2 className="w-full relative text-lg font-semibold text-nowrap">
      Effect Playground
      <span className="w-full font-mono normal-case absolute ml-2 mt-[-3px] text-slate-400 dark:text-slate-500 text-[10px]">
        Alpha
      </span>
    </h2>
  )
}
