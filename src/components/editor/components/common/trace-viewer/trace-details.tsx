import { Option } from "effect"
import { RxRef, useRxRef } from "@effect-rx/rx-react"
import { Row } from "@tanstack/react-table"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { SpanEventNode, SpanNode } from "@/workspaces/services/TraceProvider"
import { formatDuration } from "./utils"

export function TraceDetails({ span }: { readonly span: SpanNode }) {
  return (
    <div className="flex flex-col mb-1 p-2 bg-black rounded-sm">
      <div className="flex justify-between mb-2 px-2 pb-1 border-b">
        <h3 className="font-display text-lg">{span.label}</h3>
        <div>
          <span className="mr-1 text-muted-foreground">Duration:</span>
          <span className="text-foreground">
            {formatDuration(Option.getOrThrow(span.duration))}
          </span>
        </div>
      </div>
      <Accordion type="multiple" className="w-fit">
        <AccordionItem value="attributes" className="mb-2">
          <AccordionTrigger
            icon="left"
            className="p-0 justify-start font-display data-[state=open]:mb-1"
          >
            <span className="ml-1">Attributes</span>
          </AccordionTrigger>
          <AccordionContent className="p-0">
            <TraceAttributes attributes={Array.from(span.attributes)} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="events">
          <AccordionTrigger
            icon="left"
            className="p-0 justify-start font-display data-[state=open]:mb-1"
          >
            <span className="ml-1">Events</span>
          </AccordionTrigger>
          <AccordionContent className="p-0">
            <TraceEvents events={span.events} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

function TraceAttributes({
  attributes
}: {
  readonly attributes: ReadonlyArray<[string, string]>
}) {
  return attributes.length === 0 ? <span>No attributes</span> : (
    <Table>
      <TableHeader className="hidden">
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="[&>tr]:even:bg-muted">
        {Array.from(attributes).map(([key, value]) => (
          <TableRow key={key} className="[&>td]:py-1">
            <TableCell className="font-medium">{key}</TableCell>
            <TableCell>{JSON.stringify(value)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function TraceEvents({ events }: { readonly events: ReadonlyArray<SpanEventNode> }) {
  return (
    <div>
      {events.length === 0 ? (
        <span>No Events</span>
      ) : (
        <div>
          {events.map((node) => (
            <span key={node.event.name}>{node.event.name}</span>
          ))}
        </div>
      )}
    </div>
  )
}
