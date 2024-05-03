import React from "react"
import { useRxValue } from "@effect-rx/rx-react"
import { useFiles } from "../context/workspace"
import { selectedFileRx } from "../rx/workspace"
import { FileEditor } from "./FileEditor"

declare namespace FileEditors {
  export interface Props { }
}

export const FileEditors: React.FC<FileEditors.Props> = () => {
  const files = useFiles()
  const selected = useRxValue(selectedFileRx)
  return files.map(([file, write], index) => (
    <div
      key={file.file}
      className={`${index === selected ? "" : "hidden"} h-full w-full`}
    >
      <FileEditor file={file} write={write} />
    </div>
  ))
}

FileEditors.displayName = "FileEditors"
