interface Window {
  setColorMode(): void
  colorModeListeners: { current: (() => void)[] }
}
