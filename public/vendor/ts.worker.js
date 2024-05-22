// codes taken from the TS codebase, this ts-worker is not bundled right now so we can't easily use any module system here to import these
// https://github.com/microsoft/TypeScript/blob/1aac3555f7ebbfc10515d2ba28f041e03e75d885/src/compiler/diagnosticMessages.json#L1457-L1460
const CANNOT_FIND_NAME_CODE = 2304;
// https://github.com/microsoft/TypeScript/blob/1aac3555f7ebbfc10515d2ba28f041e03e75d885/src/compiler/diagnosticMessages.json#L2409-L2412
const CANNOT_FIND_NAME_DID_YOU_MEAN_CODE = 2552;
// https://github.com/microsoft/TypeScript/blob/1aac3555f7ebbfc10515d2ba28f041e03e75d885/src/compiler/diagnosticMessages.json#L7110-L7113
const NO_VALUE_EXISTS_IN_SCOPE_FOR_THE_SHORTHAND_PROPERTY_CODE = 18004;

const uniq = (arr) => Array.from(new Set(arr));

// eslint-disable-next-line no-restricted-globals
self.customTSWorkerFactory = (TypeScriptWorker) => {
  return class extends TypeScriptWorker {
    getCompletionsAtPosition(fileName, position, options) {
      return this._languageService.getCompletionsAtPosition(
        fileName,
        position,
        {
          ...options,
          // enable auto-imports to be included in the completion list
          // https://github.com/microsoft/TypeScript/blob/1e2c77e728a601b92f18a7823412466fea1be913/lib/protocol.d.ts#L2619-L2623
          includeCompletionsForModuleExports: true,
          includeCompletionsForImportStatements: true
        },
      );
    }
    getCompletionEntryDetails(
      fileName,
      position,
      entryName,
      formatOptions,
      source,
      preferences,
      data,
    ) {
      return this._languageService.getCompletionEntryDetails(
        fileName,
        position,
        entryName,
        formatOptions,
        source,
        preferences,
        data,
      );
    }
  }
};