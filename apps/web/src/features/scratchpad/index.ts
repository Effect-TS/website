export {
  DEFAULT_SCRATCHPAD_SNIPPET,
  resolveLspWsUrl,
  SCRATCHPAD_FILE_URI,
  SCRATCHPAD_ROOT_URI,
} from "./config.ts"
export {
  ScratchpadSessionContext,
  useScratchpadSession,
  type ScratchpadSessionContextValue,
} from "./context.tsx"
export {
  makeScratchpadEditorSession,
  type EditorViewFactory,
  type ScratchpadEditorInstance,
  type ScratchpadEditorSession,
  type ScratchpadEditorSessionConfig,
} from "./editor.ts"
export { Scratchpad, type ScratchpadProps } from "./Scratchpad.tsx"
export {
  computeBackoffDelayMs,
  DEFAULT_BACKOFF_POLICY,
  LSP_CLIENT_TIMEOUT_MS,
  makeScratchpadSession,
  MAX_DOC_BYTES,
  RECONNECT_BASE_DELAY_MS,
  RECONNECT_FACTOR,
  RECONNECT_MAX_ATTEMPTS,
  RECONNECT_MAX_DELAY_MS,
  utf8ByteLength,
  type BackoffPolicy,
  type ExplicitWakeTrigger,
  type LspErrorCode,
  type LspStatus,
  type PassiveEvent,
  type ScratchpadSession,
  type ScratchpadSessionConfig,
  type WakeTrigger,
} from "./session.ts"
export {
  describeLspStatus,
  type LspStatusTone,
  type LspStatusView,
} from "./status.ts"
export { StatusIndicator } from "./StatusIndicator.tsx"
export {
  layerInMemoryFake,
  layerSocket,
  layerWebSocket,
  LspTransport,
  makeFakeLspTransport,
  TransportClosedError,
  TransportConnectError,
  type FakeLspController,
  type FakeLspTransportHandle,
  type FakeLspTransportOptions,
  type JsonRpcMessage,
  type JsonRpcRequest,
  type LspTransportService,
  type TransportError,
  type TransportEvent,
} from "./transport.ts"
