import { RenderableResult, type ResultDisplay } from "../../model/domain"

export class PrimitiveResult extends RenderableResult {
  readonly value: string | number | boolean
  constructor(value: string | number | boolean) {
    super()
    this.value = value
  }
  display(): ResultDisplay {
    return { size: "Small", text: String(this.value) }
  }
  render(): React.ReactNode {
    return <div className="text-lg">{this.value}</div>
  }
}
