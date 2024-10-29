import * as Data from "effect/Data"

export class FileAlreadyExistsError extends Data.TaggedError("FileAlreadyExistsError")<{
  readonly path: string
}> {
  override get message(): string {
    return `The file at path '${this.path}' already exists`
  }
}

export class FileNotFoundError extends Data.TaggedError("FileNotFoundError")<{
  readonly path: string
}> {
  override get message(): string {
    return `File not found at path: ${this.path}`
  }
}

export class FileValidationError extends Data.TaggedError("FileValidationError")<{
  readonly reason: "InvalidName" | "UnsupportedType"
}> {
  override get message(): string {
    switch (this.reason) {
      case "InvalidName": {
        return "Directory names cannot be empty or contain '/'."
      }
      case "UnsupportedType": {
        return "The playground currently only supports creation of `.ts` files."
      }
    }
  }

  // get asToast(): Omit<Toast, "id"> {
  //   return {
  //     title:
  //       this.reason === "InvalidName"
  //         ? "Invalid Name"
  //         : "Unsupported File Type",
  //     description: this.message,
  //     variant: "destructive",
  //     duration: 5000
  //   }
  // }
}
