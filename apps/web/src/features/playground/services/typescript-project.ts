export interface ExtraLibDefaults {
  readonly addExtraLib: (
    content: string,
    filePath: string,
  ) => { readonly dispose: () => void }
}

export interface ExtraLibRegistry {
  readonly replace: (files: ReadonlyMap<string, string>) => void
  readonly dispose: () => void
}

export const ExtraLibRegistry = {
  make(defaults: ExtraLibDefaults): ExtraLibRegistry {
    const registrations = new Map<
      string,
      { readonly content: string; readonly dispose: () => void }
    >()

    function replace(files: ReadonlyMap<string, string>) {
      for (const [filePath, content] of files) {
        const current = registrations.get(filePath)
        if (current?.content === content) {
          continue
        }

        const next = defaults.addExtraLib(content, filePath)
        current?.dispose()
        registrations.set(filePath, { content, dispose: next.dispose })
      }

      for (const [filePath, registration] of registrations) {
        if (!files.has(filePath)) {
          registration.dispose()
          registrations.delete(filePath)
        }
      }
    }

    function dispose() {
      for (const registration of registrations.values()) {
        registration.dispose()
      }
      registrations.clear()
    }

    return { replace, dispose }
  },
} as const
