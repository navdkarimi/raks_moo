import type { Metadata } from "next";
import { AuthShell } from "../../features/auth/auth-shell";
import { LoginForm } from "../../features/auth/login-form";

export const metadata: Metadata = { title: "ورود یا ساخت حساب | رقص مو" };

export default function LoginPage() {
  return (
    <AuthShell>
      <LoginForm />
    </AuthShell>
  );
}
