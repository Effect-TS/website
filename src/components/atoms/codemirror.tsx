import * as React from "react"
import { closeBrackets, autocompletion, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { history, defaultKeymap, historyKeymap, indentWithTab } from '@codemirror/commands';
import {
  foldGutter,
  indentOnInput,
  syntaxHighlighting,
  defaultHighlightStyle,
  bracketMatching,
  indentUnit,
  foldKeymap,
} from '@codemirror/language';
import { lintKeymap } from '@codemirror/lint'
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { Annotation, EditorState, EditorStateConfig, Extension, StateEffect, StateField } from "@codemirror/state"
import {
  crosshairCursor,
  drawSelection,
  dropCursor,
  keymap,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  lineNumbers,
  placeholder,
  rectangularSelection,
  EditorView,
  KeyBinding,
  ViewUpdate
} from "@codemirror/view"

export declare namespace CodeMirror {
  export interface Ref {
    readonly editor?: HTMLDivElement | null
    readonly state?: EditorState
    readonly view?: EditorView
  }

  export interface Props extends Omit<EditorStateConfig, 'doc' | 'extensions'>,
      Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'placeholder'> {
    readonly value?: string
    readonly initialState?: {
      readonly json: unknown
      readonly fields: Record<string, StateField<unknown>>
    }
    readonly theme?: 'light' | 'dark' | 'none' | Extension
    readonly extensions?: ReadonlyArray<Extension>
    readonly editable?: boolean
    readonly readOnly?: boolean
    readonly indentWithTab?: boolean
    readonly placeholder?: string | HTMLElement
    readonly height?: string | null
    readonly minHeight?: string | null
    readonly maxHeight?: string | null
    readonly width?: string | null
    readonly minWidth?: string | null
    readonly maxWidth?: string | null
    readonly onChange?: (value: string, viewUpdate: ViewUpdate) => void
  }
}

export declare namespace UseCodeMirror {
  export interface Props extends CodeMirror.Props {
    readonly container: HTMLDivElement
  }
}

interface GetDefaultExtensionsOptions {
  readonly indentWithTab?: boolean;
  // basicSetup?: boolean | BasicSetupOptions
  readonly placeholder?: string | HTMLElement
  readonly theme?: 'light' | 'dark' | 'none' | Extension
  readonly readOnly?: boolean
  readonly editable?: boolean
}

const External = Annotation.define<boolean>();

const emptyExtensions: ReadonlyArray<Extension> = []

export const defaultLightThemeOption = EditorView.theme(
  {
    '&': {
      backgroundColor: '#fff',
    },
  },
  {
    dark: false,
  }
)

const getDefaultExtensions = ({
  indentWithTab: defaultIndentWithTab = true,
  editable = true,
  readOnly = false,
  theme = 'light',
  placeholder: placeholderStr = '',
  // basicSetup: defaultBasicSetup = true,
}: GetDefaultExtensionsOptions = {}): Extension[] => {
  const extensions: Array<Extension> = [basicSetup()]

  if (defaultIndentWithTab) {
    extensions.unshift(keymap.of([indentWithTab]))
  }

  // if (defaultBasicSetup) {
  //   if (typeof defaultBasicSetup === 'boolean') {
  //     getExtensions.unshift(basicSetup())
  //   } else {
  //     getExtensions.unshift(basicSetup(defaultBasicSetup))
  //   }
  // }

  if (placeholderStr) {
    extensions.unshift(placeholder(placeholderStr))
  }

  switch (theme) {
    case 'light':
      extensions.push(defaultLightThemeOption)
      break
    // case 'dark':
    //   getExtensions.push(oneDark)
    //   break;
    // case 'none':
    //   break
    default:
      // getExtensions.push(theme)
      break
  }

  if (editable === false) {
    extensions.push(EditorView.editable.of(false))
  }

  if (readOnly) {
    extensions.push(EditorState.readOnly.of(true))
  }

  return extensions
}

export const useCodeMirror = ({
  value,
  initialState,
  theme,
  onChange,
  extensions = emptyExtensions,
  editable = true,
  indentWithTab = true,
  readOnly = false,
  placeholder = '',
  height = null,
  minHeight = null,
  maxHeight = null,
  width = null,
  minWidth = null,
  maxWidth = null,
  ...props
}: UseCodeMirror.Props) => {
  const [container, setContainer] = React.useState<HTMLDivElement>()
  const [view, setView] = React.useState<EditorView>()
  const [state, setState] = React.useState<EditorState>()

  const defaultThemeOption = EditorView.theme({
    '&': {
      height,
      minHeight,
      maxHeight,
      width,
      minWidth,
      maxWidth,
    },
    '& .cm-scroller': {
      height: '100% !important',
    },
  })

  const updateListener = EditorView.updateListener.of((update: ViewUpdate) => {
    if (
      update.docChanged &&
      typeof onChange === 'function' &&
      // Fix echoing of the remote changes:
      // If transaction is market as remote we don't have to call `onChange` handler again
      !update.transactions.some((tr) => tr.annotation(External))
    ) {
      onChange(update.state.doc.toString(), update);
    }
  })

  const defaultExtensions = getDefaultExtensions({
    theme,
    editable,
    readOnly,
    placeholder,
    indentWithTab,
    // basicSetup: defaultBasicSetup,
  });

  let getExtensions = React.useMemo(() =>
    [updateListener, defaultThemeOption, ...defaultExtensions].concat(extensions),
    [defaultExtensions, defaultThemeOption, extensions, updateListener]
  )

  // if (onUpdate && typeof onUpdate === 'function') {
  //   getExtensions.push(EditorView.updateListener.of(onUpdate));
  // }

  React.useEffect(() => {
    if (container && !state) {
      const config: EditorStateConfig = {
        doc: value,
        extensions: getExtensions
      };
      const currentState = initialState
        ? EditorState.fromJSON(initialState.json, config, initialState.fields)
        : EditorState.create(config)
      setState(currentState)

      if (!view) {
        const currentView = new EditorView({
          state: currentState,
          parent: container,
          // root: globalThis.document
        })
        setView(currentView)
      }
    }
    return () => {
      if (view) {
        setState(undefined)
        setView(undefined)
      }
    };
  }, [container, getExtensions, initialState, state, value, view])

  React.useEffect(() => {
    setContainer(props.container)
  }, [props.container])

  React.useEffect(() => {
    return () => {
      if (view) {
        view.destroy();
        setView(undefined);
      }
    }
  }, [view])

  React.useEffect(() => {
    if (view) {
      view.dispatch({ effects: StateEffect.reconfigure.of(getExtensions) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    theme,
    extensions,
    height,
    minHeight,
    maxHeight,
    width,
    minWidth,
    maxWidth,
    placeholder,
    editable,
    readOnly,
    indentWithTab,
    onChange,
    // onUpdate,
  ])

  React.useEffect(() => {
    if (value === undefined) {
      return
    }
    const currentValue = view ? view.state.doc.toString() : ''
    if (view && value !== currentValue) {
      view.dispatch({
        changes: { from: 0, to: currentValue.length, insert: value || '' },
        annotations: [External.of(true)]
      })
    }
  }, [value, view])

  return { state, setState, view, setView, container, setContainer }
}

export const CodeMirror = React.forwardRef<CodeMirror.Ref, CodeMirror.Props>(({
  value,
  className,
  initialState,
  theme,
  extensions,
  editable,
  indentWithTab,
  readOnly,
  placeholder,
  height,
  minHeight,
  maxHeight,
  width,
  minWidth,
  maxWidth,
  onChange,
  ...other
}, ref) => {
  const editor = React.useRef<HTMLDivElement>(null)
  const codeMirror = useCodeMirror({
    container: editor.current!,
    value,
    initialState,
    theme,
    extensions,
    editable,
    indentWithTab,
    readOnly,
    placeholder,
    height,
    minHeight,
    maxHeight,
    width,
    minWidth,
    maxWidth,
    onChange
  })

  React.useImperativeHandle(ref, () => ({
    editor: editor.current,
    state: codeMirror.state,
    view: codeMirror.view
  }))

  const defaultClassNames = typeof theme === 'string' ? `cm-theme-${theme}` : 'cm-theme';

  return (
    <div
      ref={editor}
      className={`${defaultClassNames}${className ? ` ${className}` : ''}`}
      {...other}
    />
  )
})

CodeMirror.displayName = "CodeMirror"

export interface MinimalSetupOptions {
  readonly highlightSpecialChars?: boolean
  readonly history?: boolean
  readonly drawSelection?: boolean
  readonly syntaxHighlighting?: boolean
  readonly defaultKeymap?: boolean
  readonly historyKeymap?: boolean
}

export interface BasicSetupOptions extends MinimalSetupOptions {
  readonly lineNumbers?: boolean
  readonly highlightActiveLineGutter?: boolean
  readonly foldGutter?: boolean
  readonly dropCursor?: boolean
  readonly allowMultipleSelections?: boolean
  readonly indentOnInput?: boolean
  readonly bracketMatching?: boolean
  readonly closeBrackets?: boolean
  readonly autocompletion?: boolean
  readonly rectangularSelection?: boolean
  readonly crosshairCursor?: boolean
  readonly highlightActiveLine?: boolean
  readonly highlightSelectionMatches?: boolean
  readonly closeBracketsKeymap?: boolean
  readonly searchKeymap?: boolean
  readonly foldKeymap?: boolean
  readonly completionKeymap?: boolean
  readonly lintKeymap?: boolean
  readonly tabSize?: number
}

export const minimalSetup = (options: MinimalSetupOptions = {}): ReadonlyArray<Extension> => {
  let keymaps: Array<KeyBinding> = []
  if (options.defaultKeymap !== false) {
    keymaps = keymaps.concat(defaultKeymap)
  }
  if (options.historyKeymap !== false) {
    keymaps = keymaps.concat(historyKeymap)
  }
  const extensions: Array<Extension> = []
  if (options.highlightSpecialChars !== false) {
    extensions.push(highlightSpecialChars())
  }
  if (options.history !== false) {
    extensions.push(history())
  }
  if (options.drawSelection !== false) {
    extensions.push(drawSelection())
  }
  if (options.syntaxHighlighting !== false) {
    extensions.push(syntaxHighlighting(defaultHighlightStyle, { fallback: true }))
  }
  return extensions.concat([keymap.of(keymaps.flat())]).filter(Boolean)
};

export const basicSetup = (options: BasicSetupOptions = {}): ReadonlyArray<Extension> => {
  const { crosshairCursor: initCrosshairCursor = false } = options
  let keymaps: Array<KeyBinding> = []
  if (options.closeBracketsKeymap !== false) {
    keymaps = keymaps.concat(closeBracketsKeymap)
  }
  if (options.defaultKeymap !== false) {
    keymaps = keymaps.concat(defaultKeymap)
  }
  if (options.searchKeymap !== false) {
    keymaps = keymaps.concat(searchKeymap)
  }
  if (options.historyKeymap !== false) {
    keymaps = keymaps.concat(historyKeymap)
  }
  if (options.foldKeymap !== false) {
    keymaps = keymaps.concat(foldKeymap)
  }
  if (options.completionKeymap !== false) {
    keymaps = keymaps.concat(completionKeymap)
  }
  if (options.lintKeymap !== false) {
    keymaps = keymaps.concat(lintKeymap)
  }
  const extensions: Array<Extension> = []
  if (options.lineNumbers !== false) {
    extensions.push(lineNumbers())
  }
  if (options.highlightActiveLineGutter !== false) {
    extensions.push(highlightActiveLineGutter())
  }
  if (options.highlightSpecialChars !== false) {
    extensions.push(highlightSpecialChars())
  }
  if (options.history !== false) {
    extensions.push(history())
  }
  if (options.foldGutter !== false) {
    extensions.push(foldGutter())
  }
  if (options.drawSelection !== false) {
    extensions.push(drawSelection())
  }
  if (options.dropCursor !== false) {
    extensions.push(dropCursor())
  }
  if (options.allowMultipleSelections !== false) {
    extensions.push(EditorState.allowMultipleSelections.of(true))
  }
  if (options.indentOnInput !== false) {
    extensions.push(indentOnInput())
  }
  if (options.syntaxHighlighting !== false) {
    extensions.push(syntaxHighlighting(defaultHighlightStyle, { fallback: true }))
  }
  if (options.bracketMatching !== false) {
    extensions.push(bracketMatching())
  }
  if (options.closeBrackets !== false) {
    extensions.push(closeBrackets())
  }
  if (options.autocompletion !== false) {
    extensions.push(autocompletion())
  }
  if (options.rectangularSelection !== false) {
    extensions.push(rectangularSelection())
  }
  if (initCrosshairCursor !== false) {
    extensions.push(crosshairCursor())
  }
  if (options.highlightActiveLine !== false) {
    extensions.push(highlightActiveLine())
  }
  if (options.highlightSelectionMatches !== false) {
    extensions.push(highlightSelectionMatches())
  }
  if (options.tabSize && typeof options.tabSize === 'number') {
    extensions.push(indentUnit.of(' '.repeat(options.tabSize)))
  }
  return extensions.concat([keymap.of(keymaps.flat())]).filter(Boolean)
};
