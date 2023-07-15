export class Logger {
  log(message: string): void {
    console.log(message)
  }
}

export class Mailer {
  logger = new Logger()
  sendMail(address: string, message: string): void {
    this.logger.log(`Sending the message ${message} to ${address}`)
  }
}
