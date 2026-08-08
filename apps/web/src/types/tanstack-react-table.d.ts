import "@tanstack/react-table"

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    grow: boolean
  }
}
