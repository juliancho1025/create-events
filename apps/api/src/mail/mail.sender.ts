import { Inject, Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { appConfig, type AppConfig } from '../config/app-config.js';

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Thin wrapper over nodemailer (SMTP), so tests can swap in a fake (like PushSender).
 * Without SMTP_URL nothing is sent: the email is logged instead, handy in local dev.
 */
@Injectable()
export class MailSender {
  private readonly logger = new Logger(MailSender.name);
  private readonly transport: Transporter | null;
  private readonly from: string;

  constructor(@Inject(appConfig.KEY) config: AppConfig) {
    this.transport = config.mail.smtpUrl ? nodemailer.createTransport(config.mail.smtpUrl) : null;
    this.from = config.mail.from;
  }

  async send(mail: Mail): Promise<void> {
    if (!this.transport) {
      this.logger.log(`SMTP_URL not set, not sending "${mail.subject}" to ${mail.to}:\n${mail.text}`);
      return;
    }
    await this.transport.sendMail({ from: this.from, ...mail });
  }
}
