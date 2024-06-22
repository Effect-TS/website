import { ColumnDef } from "@tanstack/react-table"

export interface SpanRow {
  readonly traceId: string
  readonly spanId: string
}

export const columns: Array<ColumnDef<SpanRow>> = [
  {
    header: "Trace Id",
    accessorKey: "traceId"
  },
  {
    header: "Span Id",
    accessorKey: "spanId"
  }
]
