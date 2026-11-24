import {
  closeHoverTooltips,
  type EditorView,
  hasHoverTooltips,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view"

/**
 * Closes a hover tooltip that opens after the pointer left the editor.
 *
 * A language server hover is async. CodeMirror cancels a pending hover timer
 * when the pointer leaves the editor, but not a request already sent, so the
 * answer can open a tooltip with no pointer near it. Nothing closes it until
 * the pointer comes back, and meanwhile it covers the code. Tooltips are
 * inside the editor's DOM, so moving onto one doesn't count as leaving.
 */
export const closeLateHovers = ViewPlugin.fromClass(
  class {
    readonly view: EditorView
    inside = false
    readonly enter = () => {
      this.inside = true
    }
    readonly leave = () => {
      this.inside = false
    }

    constructor(view: EditorView) {
      this.view = view
      // `mouseenter` doesn't fire for a pointer already over the editor on
      // load, so any movement inside counts too.
      view.dom.addEventListener("mouseenter", this.enter)
      view.dom.addEventListener("mousemove", this.enter)
      view.dom.addEventListener("mouseleave", this.leave)
    }

    update(update: ViewUpdate) {
      if (this.inside || !hasHoverTooltips(update.state)) return
      if (hasHoverTooltips(update.startState)) return
      // A view can't dispatch during its own update.
      queueMicrotask(() => {
        if (!this.inside && hasHoverTooltips(this.view.state)) {
          this.view.dispatch({ effects: closeHoverTooltips })
        }
      })
    }

    destroy() {
      this.view.dom.removeEventListener("mouseenter", this.enter)
      this.view.dom.removeEventListener("mousemove", this.enter)
      this.view.dom.removeEventListener("mouseleave", this.leave)
    }
  },
)
