import { RenderableResult, type ResultDisplay } from "../../model/domain"

export class ErrorResult extends RenderableResult {
  readonly message: string
  constructor(error: string | Error) {
    super()
    this.message = typeof error === "string" ? error : error.message
  }
  display(): ResultDisplay {
    return { size: "Small", text: this.message }
  }
  render(): React.ReactNode {
    return <div className="text-lg">{this.message}</div>
  }
}
