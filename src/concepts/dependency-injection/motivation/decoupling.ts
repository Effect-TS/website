export class Logger {
  log(message: string): void {
    console.log(message)
  }
}

export class Mailer {
  constructor(readonly logger: Logger) {}
  sendMail(address: string, message: string): void {
    this.logger.log(`Sending the message ${message} to ${address}`)
  }
}

const logger = new Logger()
const mailer = new Mailer(logger)
