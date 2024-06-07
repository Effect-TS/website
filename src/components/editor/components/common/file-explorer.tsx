import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer
} from "react"
import { Data } from "effect"
import { RxRef } from "@effect-rx/rx-react"
import { useSetWorkspace, useWorkspaceTree } from "@/workspaces/context"
import { FileTree } from "./file-explorer/file-tree"
import { File, Directory } from "@/workspaces/domain/workspace"

export declare namespace FileExplorer {
  export type Reducer = React.Reducer<State, Action>

  export interface State {
    readonly mode: Mode
  }

  export type Dispatch = React.Dispatch<Action>

  export type Action = Data.TaggedEnum<{
    readonly CreateNode: {
      readonly type: InputType
      readonly path: string
    }
    readonly EditNode: {
      readonly node: File | Directory
    }
    readonly SetIdle: {}
  }>

  export type InputType = "file" | "directory"

  export type Mode = Data.TaggedEnum<{
    readonly Idle: {}
    readonly CreatingNode: {
      readonly type: InputType
      readonly path: string
    }
    readonly EditingNode: {
      readonly node: File | Directory
    }
  }>

  export type CreatingNode = Extract<Mode, { _tag: "CreatingNode" }>
}

export const Action = Data.taggedEnum<FileExplorer.Action>()
export const Mode = Data.taggedEnum<FileExplorer.Mode>()

// See here for why we are using this pattern:
// https://react.dev/learn/scaling-up-with-reducer-and-context#combining-a-reducer-with-context
const StateContext = createContext<FileExplorer.State>(null as any)
const DispatchContext = createContext<FileExplorer.Dispatch>(null as any)

export const useExplorerState = () => useContext(StateContext)
export const useExplorerDispatch = () => useContext(DispatchContext)

function reducer(
  state: FileExplorer.State,
  action: FileExplorer.Action
): FileExplorer.State {
  switch (action._tag) {
    case "CreateNode": {
      const mode = Mode.CreatingNode({
        type: action.type,
        path: action.path
      })
      return { ...state, mode }
    }
    case "EditNode": {
      const mode = Mode.EditingNode({
        node: action.node
      })
      return { ...state, mode }
    }
    case "SetIdle": {
      return {
        ...state,
        mode: Mode.Idle()
      }
    }
  }
}

const initialState: FileExplorer.State = {
  mode: Mode.Idle()
}

export function FileExplorer() {
  const setWorkspace = useSetWorkspace()
  const tree = useWorkspaceTree()
  const ref = useMemo(() => RxRef.make(tree), [tree])
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(
    () => ref.subscribe((tree) => setWorkspace((_) => _.setTree(tree))),
    [ref, setWorkspace]
  )

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        <aside className="min-h-full w-full overflow-auto">
          <FileTree tree={ref} />
        </aside>
      </DispatchContext.Provider>
    </StateContext.Provider>
  )
}
