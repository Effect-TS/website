import { RenderableResult } from "../../model/domain"

export class ErrorResult extends RenderableResult {
  readonly message: string
  constructor(error: string | Error) {
    super()
    this.message = typeof error === "string" ? error : error.message
  }
  render(): React.ReactNode {
    return <div className="text-2xl">{this.message}</div>
  }
}
