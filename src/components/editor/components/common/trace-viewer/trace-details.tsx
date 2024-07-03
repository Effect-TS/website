import React, { useMemo } from "react"
import { Duration, Option } from "effect"
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
import { useSelectedSpan } from "@/workspaces/context/devtools"
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
      <Accordion type="multiple">
        <AccordionItem value="attributes" className="mb-2">
          <AccordionTrigger
            icon="left"
            className="py-0 pl-2 justify-start font-display data-[state=open]:mb-1"
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
            className="py-1 pl-2 justify-start bg-muted font-display"
          >
            <span className="ml-1">Events</span>
          </AccordionTrigger>
          <AccordionContent className="py-2 bg-muted/80">
            <TraceEvents events={span.events} />
            <div className="mt-2 ml-2 text-xs text-muted-foreground">
              <span>Log timestamps are relative to the start time of the full trace</span>
            </div>
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
  return (
    <div className="ml-2">
      {attributes.length === 0 ? (
        <span>No attributes</span>
      ) : (
        <Table>
          <TableHeader className="hidden">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="[&>tr>td]:py-1">
            {Array.from(attributes).map(([key, value]) => (
              <TableRow key={key} className="even:bg-muted odd:bg-primary-foreground">
                <TableCell className="font-medium">{key}</TableCell>
                <TableCell>{JSON.stringify(value)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

function TraceEvents({
  events
}: {
  readonly events: ReadonlyArray<SpanEventNode>
}) {
  return (
    <div className="ml-2">
      {events.length === 0 ? (
        <span>No Events</span>
      ) : (
        <Accordion type="multiple" className="w-fit">
          {events.map((node, index) => (
            <AccordionItem key={index} value={`${index}`}>
              <TraceEvent node={node} />
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  )
}

function TraceEvent({ node }: { readonly node: SpanEventNode }) {
  const selectedSpan = useSelectedSpan()
  const eventTimestamp = useMemo(() => {
    if (selectedSpan !== undefined) {
      const traceStartTime = Option.getOrThrow(selectedSpan.startTime)
      const eventStartTime = Duration.nanos(node.event.startTime)
      const relativeTimestamp = Duration.subtract(
        eventStartTime,
        traceStartTime
      )
      return formatDuration(relativeTimestamp)
    }
    return ""
  }, [node.event.startTime, selectedSpan])
  return (
    <>
      <AccordionTrigger
        icon="left"
        className="p-0 justify-start font-display data-[state=open]:mb-1"
      >
        <span className="ml-1">{eventTimestamp}</span>
      </AccordionTrigger>
      <AccordionContent className="p-0">
          <Table>
            <TableHeader className="hidden">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&>tr>td]:py-1">
              <TableRow className="even:bg-muted odd:bg-primary-foreground">
                <TableCell className="font-medium">message</TableCell>
                <TableCell>{JSON.stringify(node.event.name)}</TableCell>
              </TableRow>
              {Object.entries(node.event.attributes).map(([key, value]) => (
                <TableRow key={key} className="even:bg-muted odd:bg-primary-foreground">
                  <TableCell className="font-medium">{key}</TableCell>
                  <TableCell>{JSON.stringify(value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
      </AccordionContent>
    </>
  )
}
