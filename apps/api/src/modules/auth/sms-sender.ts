export interface SmsSender {
  readonly available: boolean;
  sendOtp(message: {
    mobile: string;
    code: string;
    expiresInSeconds: number;
  }): Promise<void>;
}

// Deliberately fails closed until a real provider is configured. Never log OTPs.
export class UnconfiguredSmsSender implements SmsSender {
  readonly available = false;
  async sendOtp(): Promise<void> {
    throw new Error("SMS provider is not configured");
  }
}
