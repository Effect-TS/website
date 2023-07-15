import * as HostPort from "./HostPort"
import { Config } from "effect"

class ServiceConfig {
  constructor(readonly hostPort: HostPort.HostPort, readonly timeout: number) {}
}

const config: Config.Config<ServiceConfig> = Config.all(
  HostPort.config,
  Config.float("TIMEOUT")
).pipe(
  Config.map(([hostPort, timeout]) => new ServiceConfig(hostPort, timeout))
)
