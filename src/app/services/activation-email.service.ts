import { Injectable } from '@angular/core';

type ActivationEmailPayload = {
  toEmail: string;
  toName: string;
  activationUrl: string;
  expiresInHours: number;
  accountType: 'user' | 'driver';
};

@Injectable({ providedIn: 'root' })
export class ActivationEmailService {
  seedDefaultConfig(): void {
    if (!localStorage.getItem('emailjsPublicKey')) {
      localStorage.setItem('emailjsPublicKey', 'nTdXHeMbvr53J59MK');
    }

    if (!localStorage.getItem('emailjsServiceId')) {
      localStorage.setItem('emailjsServiceId', 'service_ffiwvof');
    }

    if (!localStorage.getItem('emailjsTemplateId')) {
      localStorage.setItem('emailjsTemplateId', 'template_w3rgayo');
    }
  }

  hasConfig(): boolean {
    const config = this.getConfig();
    return Boolean(config.publicKey && config.serviceId && config.templateId);
  }

  getConfig(): { publicKey: string; serviceId: string; templateId: string } {
    return {
      publicKey: this.readConfig('emailjsPublicKey'),
      serviceId: this.readConfig('emailjsServiceId'),
      templateId: this.readConfig('emailjsTemplateId')
    };
  }

  saveConfig(config: { publicKey: string; serviceId: string; templateId: string }): void {
    localStorage.setItem('emailjsPublicKey', config.publicKey.trim());
    localStorage.setItem('emailjsServiceId', config.serviceId.trim());
    localStorage.setItem('emailjsTemplateId', config.templateId.trim());
  }

  async sendActivationEmail(payload: ActivationEmailPayload): Promise<{ ok: true } | { ok: false; message: string }> {
    const { publicKey, serviceId, templateId } = this.getConfig();

    if (!publicKey || !serviceId || !templateId) {
      return {
        ok: false,
        message: 'EmailJS podešavanje nije uneto. Dodaj `emailjsPublicKey`, `emailjsServiceId` i `emailjsTemplateId` u localStorage da bi slanje radilo.'
      };
    }

    try {
      const emailjs = await import('@emailjs/browser');
      await emailjs.send(
        serviceId,
        templateId,
        {
          to_email: payload.toEmail,
          email: payload.toEmail,
          reply_to: payload.toEmail,
          to_name: payload.toName,
          activation_url: payload.activationUrl,
          expires_in_hours: payload.expiresInHours,
          account_type: payload.accountType
        },
        { publicKey }
      );

      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nepoznata greška pri slanju email-a.';
      return { ok: false, message: `EmailJS greška: ${message}` };
    }
  }

  private readConfig(key: string): string {
    return localStorage.getItem(key) ?? '';
  }
}