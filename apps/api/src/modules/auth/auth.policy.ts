export interface AuthPolicy {
  otpLifetimeSeconds: number;
  resendDelaySeconds: number;
  maxAttempts: number;
  sendsPerMobilePerHour: number;
  sendsPerIpPerHour: number;
  verificationsPerIpPerHour: number;
  sessionLifetimeSeconds: number;
}

// Initial operational defaults, not irreversible business rules.
export const defaultAuthPolicy: Readonly<AuthPolicy> = Object.freeze({
  otpLifetimeSeconds: 180,
  resendDelaySeconds: 60,
  maxAttempts: 5,
  sendsPerMobilePerHour: 5,
  sendsPerIpPerHour: 30,
  verificationsPerIpPerHour: 100,
  sessionLifetimeSeconds: 7 * 24 * 60 * 60,
});
