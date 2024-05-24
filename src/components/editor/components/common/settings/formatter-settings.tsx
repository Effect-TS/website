"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { effectTsResolver } from "@hookform/resolvers/effect-ts"
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form"

import { Settings, type EncodedSettings } from "@/components/editor/services/Monaco/formatters/typescript"

export declare namespace FormatterSettings {
  export interface Props {
    readonly open: boolean
    readonly onOpenChange: OnOpenChange
  }

  export interface OnOpenChange {
    (open: boolean): void
  }
}

export const FormatterSettings: React.FC<FormatterSettings.Props> = ({
  open,
  onOpenChange
}) => {
  const form = useForm<EncodedSettings>({
    resolver: effectTsResolver(Settings as any),
    defaultValues: {
      indentWidth: "2",
      lineWidth: "120",
      operatorPosition: "maintain",
      quoteStyle: "alwaysDouble",
      semiColons: "asi",
      trailingCommas: "never"
    }
  })

  const handleSubmit: SubmitHandler<any> = (values: Settings) => {
    console.log(values)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <Form {...form}>
          <form
            className="space-y-8"
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            <DialogHeader>
              <DialogTitle>Formatter Settings</DialogTitle>
              <DialogDescription>
                You can modify the settings for the TypeScript code formatter
                below.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 py-4">
              <FormField
                name="lineWidth"
                control={form.control}
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 grid-rows-2 items-center gap-x-4">
                    <FormLabel className="text-right">Line Width</FormLabel>
                    <FormControl>
                      <Input
                        className="col-span-3"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="col-start-2 col-span-3">
                      The width of a line the printer will try to stay under.
                      Note that the printer may exceed this width in certain
                      cases.
                    </FormDescription>
                    <FormMessage className="col-start-2 col-span-3" />
                  </FormItem>
                )}
              />
              <FormField
                name="indentWidth"
                control={form.control}
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 grid-rows-2 items-center gap-x-4">
                    <FormLabel className="text-right">Indent Width</FormLabel>
                    <FormControl>
                      <Input
                        className="col-span-3"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="col-start-2 col-span-3">
                      The number of columns for an indent.
                    </FormDescription>
                    <FormMessage className="col-start-2 col-span-3" />
                  </FormItem>
                )}
              />
              <FormField
                name="operatorPosition"
                control={form.control}
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 grid-rows-2 items-center gap-x-4">
                    <FormLabel className="text-right">
                      Operator Position
                    </FormLabel>
                    <Select
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="col-start-2 col-span-3">
                          <SelectValue placeholder="Select a value" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="maintain">Maintain</SelectItem>
                        <SelectItem value="nextLine">Next Line</SelectItem>
                        <SelectItem value="sameLine">Same Line</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="col-start-2 col-span-3">
                      Where to place the operator for expressions that span
                      multiple lines.
                    </FormDescription>
                    <FormMessage className="col-start-2 col-span-3" />
                  </FormItem>
                )}
              />
              <FormField
                name="quoteStyle"
                control={form.control}
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 grid-rows-2 items-center gap-x-4">
                    <FormLabel className="text-right">Quote Style</FormLabel>
                    <Select
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="col-start-2 col-span-3">
                          <SelectValue placeholder="Select a value" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="alwaysDouble">
                          Always Double
                        </SelectItem>
                        <SelectItem value="alwaysSingle">
                          Always Single
                        </SelectItem>
                        <SelectItem value="preferDouble">
                          Prefer Double
                        </SelectItem>
                        <SelectItem value="preferSingle">
                          Prefer Single
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="col-start-2 col-span-3">
                      How to use single or double quotes.
                    </FormDescription>
                    <FormMessage className="col-start-2 col-span-3" />
                  </FormItem>
                )}
              />
              <FormField
                name="semiColons"
                control={form.control}
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 grid-rows-2 items-center gap-x-4">
                    <FormLabel className="text-right">Semicolons</FormLabel>
                    <Select
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="col-start-2 col-span-3">
                          <SelectValue placeholder="Select a value" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="always">Always</SelectItem>
                        <SelectItem value="asi">Automatic</SelectItem>
                        <SelectItem value="prefer">Prefer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="col-start-2 col-span-3">
                      How semi-colons should be used.
                    </FormDescription>
                    <FormMessage className="col-start-2 col-span-3" />
                  </FormItem>
                )}
              />
              <FormField
                name="trailingCommas"
                control={form.control}
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 grid-rows-2 items-center gap-x-4">
                    <FormLabel className="text-right">
                      Trailing Commas
                    </FormLabel>
                    <Select
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="col-start-2 col-span-3">
                          <SelectValue placeholder="Select a value" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="always">Always</SelectItem>
                        <SelectItem value="never">Never</SelectItem>
                        <SelectItem value="onlyMultiline">
                          Only Multiline
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="col-start-2 col-span-3">
                      If trailing commas should be used.
                    </FormDescription>
                    <FormMessage className="col-start-2 col-span-3" />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" variant="outline">
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

FormatterSettings.displayName = "FormatterSettings"
