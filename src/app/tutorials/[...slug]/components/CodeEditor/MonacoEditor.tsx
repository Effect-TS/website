import React, { useState, useEffect, useRef, useCallback } from "react"
import type * as monaco from "monaco-editor/esm/vs/editor/editor.api"
import { editor, type IDisposable } from "monaco-editor"
import { usePrevious } from "../../hooks/usePrevious"
import { useUpdate } from "../../hooks/useUpdate"
import clsx from "clsx"

export type Monaco = typeof monaco

export declare namespace MonacoEditor {
  export interface Props {
    /**
     * The default value of new models. Only considered when a new model is
     * created.
     */
    readonly defaultValue?: string
    /**
     * The default language of new models. Only considered when a new model is
     * created.
     */
    readonly defaultLanguage?: string
    /**
     * The default path of new models. Only considered when a new model is
     * created.
     */
    readonly defaultPath?: string
    /**
     * The value of the current model.
     */
    readonly value?: string
    /**
     * The language of the current model.
     */
    readonly language?: string
    /**
     * The path of the current model.
     */
    readonly path?: string
    /**
     * The theme for the Monaco editor (Default options available are
     * `"vs-dark"` or `"light"`. Additional themes may be defined using
     * `monaco.editor.defineTheme`.
     *
     * Defaults to `light`.
     */
    readonly theme?: string
    /**
     * The line number to jump to when the editor is initialized.
     */
    readonly line?: number
    /**
     * The loading screen before the editor will be mounted
     * @default "Loading..."
     */
    readonly loading?: React.ReactNode
    /**
     * Options to apply to the Monaco editor.
     */
    readonly options?: editor.IStandaloneEditorConstructionOptions
    /**
     * Editor services to override.
     */
    readonly overrideServices?: editor.IEditorOverrideServices
    /**
     * Whether or not to save the models" view states between model changes.
     *
     * Defaults to `true`.
     */
    readonly saveViewState?: boolean
    /**
     * Whether or not to dispose of the current model when the editor is
     * unmounted.
     *
     * Defaults to `false`.
     */
    readonly keepCurrentModel?: boolean
    /**
     * Additional classes to apply to the editor container.
     */
    readonly className?: string
    /**
     * An event which is emitted before the editor is mounted.
     *
     * Defaults to a noop.
     */
    readonly beforeMount?: BeforeMount
    /**
     * An event which is emitted when the editor is mounted.
     *
     * Defaults to a noop.
     */
    readonly onMount?: OnMount
    /**
     * An event which is emitted when the content of the current model is
     * changed.
     *
     * Defaults to a noop.
     */
    readonly onChange?: OnChange
    /**
     * An event is emitted when the content of the current model is changed
     * and the current model markers are ready.
     *
     * Defaults to a noop.
     */
    readonly onValidate?: OnValidate
  }

  export interface OnMount {
    (editor: editor.IStandaloneCodeEditor, monaco: Monaco): void
  }

  export interface BeforeMount {
    (monaco: Monaco): void
  }

  export interface OnChange {
    (value: string | undefined, ev: editor.IModelContentChangedEvent): void
  }

  export interface OnValidate {
    (markers: ReadonlyArray<editor.IMarker>): void
  }
}

const viewStates = new Map()

const noop = () => {}

const getOrCreateModel = (
  monaco: Monaco,
  value: string,
  language: string,
  path: string
) => getModel(monaco, path) || createModel(monaco, value, language, path)

const getModel = (monaco: Monaco, path: string) =>
  monaco.editor.getModel(createModelUri(monaco, path))

const createModel = (
  monaco: Monaco,
  value: string,
  language?: string,
  path?: string
) =>
  monaco.editor.createModel(
    value,
    language,
    path ? createModelUri(monaco, path) : undefined
  )

const createModelUri = (monaco: Monaco, path: string) =>
  monaco.Uri.parse(path)

export const MonacoEditor: React.FC<MonacoEditor.Props> = React.memo(
  ({
    defaultValue,
    defaultLanguage,
    defaultPath,
    value,
    language,
    path,
    /* === */
    theme = "light",
    line,
    loading = "Loading...",
    options = {},
    overrideServices = {},
    saveViewState = true,
    keepCurrentModel = false,
    /* === */
    className,
    /* === */
    beforeMount = noop,
    onMount = noop,
    onChange,
    onValidate = noop
  }) => {
    const [isEditorReady, setIsEditorReady] = useState(false)
    const [isMonacoMounting, setIsMonacoMounting] = useState(true)
    const monacoRef = useRef<Monaco | null>(null)
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const onMountRef = useRef(onMount)
    const beforeMountRef = useRef(beforeMount)
    const subscriptionRef = useRef<IDisposable>()
    const valueRef = useRef(value)
    const previousPath = usePrevious(path)
    const preventCreation = useRef(false)
    const preventTriggerChangeEvent = useRef<boolean>(false)

    const disposeEditor = useCallback(() => {
      subscriptionRef.current?.dispose()

      if (keepCurrentModel) {
        saveViewState &&
          viewStates.set(path, editorRef.current!.saveViewState())
      } else {
        editorRef.current!.getModel()?.dispose()
      }

      editorRef.current!.dispose()
    }, [keepCurrentModel, path, saveViewState])

    useEffect(() => {
      const script = document.createElement("script")
      script.src = "/vendor/vs.loader.js"
      script.async = true
      script.onload = () => {
        const require = globalThis.require as any

        require.config({
          paths: {
            vs: "/vendor/vs"
          },
          // This is something you need for monaco to work
          ignoreDuplicateModules: ["vs/editor/editor.main"]
        })

        require([
          "vs/editor/editor.main",
          "vs/language/typescript/tsWorker"
        ], (monaco: Monaco, _tsWorker: any) => {
          const isOK = monaco && (window as any).ts

          if (!isOK) {
            console.error("Unable to setup all playground dependencies!")
            console.error("main", !!monaco, "ts", !!(window as any).ts)
            return
          }

          monacoRef.current = monaco

          setIsMonacoMounting(false)
        })
      }

      document.body.appendChild(script)

      return () => {
        if (editorRef.current) {
          disposeEditor()
        }
      }
    }, [disposeEditor])

    useUpdate(
      () => {
        const model = getOrCreateModel(
          monacoRef.current!,
          defaultValue || value || "",
          defaultLanguage || language || "",
          path || defaultPath || ""
        )

        if (model !== editorRef.current?.getModel()) {
          if (saveViewState) {
            viewStates.set(previousPath, editorRef.current?.saveViewState())
          }
          editorRef.current?.setModel(model)
          if (saveViewState) {
            editorRef.current?.restoreViewState(viewStates.get(path))
          }
        }
      },
      [path],
      isEditorReady
    )

    useUpdate(
      () => {
        editorRef.current?.updateOptions(options)
      },
      [options],
      isEditorReady
    )

    useUpdate(
      () => {
        if (!editorRef.current || value === undefined) {
          return
        }
        if (
          editorRef.current.getOption(
            monacoRef.current!.editor.EditorOption.readOnly
          )
        ) {
          editorRef.current.setValue(value)
        } else if (value !== editorRef.current.getValue()) {
          preventTriggerChangeEvent.current = true
          editorRef.current.executeEdits("", [
            {
              range: editorRef.current.getModel()!.getFullModelRange(),
              text: value,
              forceMoveMarkers: true
            }
          ])

          editorRef.current.pushUndoStop()
          preventTriggerChangeEvent.current = false
        }
      },
      [value],
      isEditorReady
    )

    useUpdate(
      () => {
        const model = editorRef.current?.getModel()
        if (model && language) {
          monacoRef.current?.editor.setModelLanguage(model, language)
        }
      },
      [language],
      isEditorReady
    )

    useUpdate(
      () => {
        // reason for undefined check: https://github.com/suren-atoyan/monaco-react/pull/188
        if (line !== undefined) {
          editorRef.current?.revealLine(line)
        }
      },
      [line],
      isEditorReady
    )

    useUpdate(
      () => {
        monacoRef.current?.editor.setTheme(theme)
      },
      [theme],
      isEditorReady
    )

    const createEditor = useCallback(() => {
      if (!containerRef.current || !monacoRef.current) {
        return
      }
      if (!preventCreation.current) {
        beforeMountRef.current(monacoRef.current)

        const autoCreatedModelPath = path || defaultPath

        const defaultModel = getOrCreateModel(
          monacoRef.current,
          value || defaultValue || "",
          defaultLanguage || language || "",
          autoCreatedModelPath || ""
        )

        editorRef.current = monacoRef.current?.editor.create(
          containerRef.current,
          {
            model: defaultModel,
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: 16,
            ...options
          },
          overrideServices
        )

        saveViewState &&
          editorRef.current.restoreViewState(
            viewStates.get(autoCreatedModelPath)
          )

        monacoRef.current.editor.setTheme(theme)

        if (line !== undefined) {
          editorRef.current.revealLine(line)
        }

        setIsEditorReady(true)
        preventCreation.current = true
      }
    }, [
      defaultValue,
      defaultLanguage,
      defaultPath,
      value,
      language,
      path,
      options,
      overrideServices,
      saveViewState,
      theme,
      line
    ])

    useEffect(() => {
      if (isEditorReady) {
        onMountRef.current(editorRef.current!, monacoRef.current!)
      }
    }, [isEditorReady])

    useEffect(() => {
      !isMonacoMounting && !isEditorReady && createEditor()
    }, [isMonacoMounting, isEditorReady, createEditor])

    // subscription
    // to avoid unnecessary updates (attach - dispose listener) in subscription
    valueRef.current = value

    // onChange
    useEffect(() => {
      if (isEditorReady && onChange) {
        subscriptionRef.current?.dispose()
        subscriptionRef.current = editorRef.current?.onDidChangeModelContent(
          (event) => {
            if (!preventTriggerChangeEvent.current) {
              onChange(editorRef.current!.getValue(), event)
            }
          }
        )
      }
    }, [isEditorReady, onChange])

    // onValidate
    useEffect(() => {
      if (isEditorReady) {
        const changeMarkersListener =
          monacoRef.current!.editor.onDidChangeMarkers((uris) => {
            const editorUri = editorRef.current!.getModel()?.uri
            if (editorUri) {
              const currentEditorHasMarkerChanges = uris.find(
                (uri) => uri.path === editorUri.path
              )
              if (currentEditorHasMarkerChanges) {
                const markers = monacoRef.current!.editor.getModelMarkers({
                  resource: editorUri
                })
                onValidate?.(markers)
              }
            }
          })

        return () => {
          changeMarkersListener?.dispose()
        }
      }
    }, [isEditorReady, onValidate])

    return (
      <section className="h-full flex flex-col">
        {!isEditorReady && (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-gray-900 dark:border-gray-600 dark:border-t-gray-400" />
            <p className="mt-4 text-gray-500 dark:text-gray-400">{loading}</p>
          </div>
        )}
        <div
          ref={containerRef}
          className={clsx(
            "flex-grow w-full",
            !isEditorReady && "hidden",
            className
          )}
        />
      </section>
    )
  }
)

MonacoEditor.displayName = "MonacoEditor"
