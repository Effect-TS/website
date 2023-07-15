interface Logger {
  log(message: string): void
}

interface Mailer {
  sendMail(address: string, message: string): void
}

class ConsoleLogger implements Logger {
  log(message: string): void {
    console.log(message)
  }
}

class ConsoleMailer implements Mailer {
  constructor(readonly logger: Logger) {}
  sendMail(address: string, message: string): void {
    this.logger.log(`Sending the message ${message} to ${address}`)
  }
}

const logger = new ConsoleLogger()
const mailer = new ConsoleMailer(logger)

class MockLogger implements Logger {
  readonly messages: Array<string> = []
  log(message: string): void {
    this.messages.push(message)
  }
}

class MockMailer implements Mailer {
  readonly sentMail: Array<string> = []
  constructor(readonly logger: Logger) {}
  sendMail(address: string, message: string): void {
    const email = `Sending the message ${message} to ${address}`
    this.logger.log(email)
    this.sentMail.push(email)
  }
}

const mockLogger = new MockLogger()
const mockMailer = new MockMailer(logger)
