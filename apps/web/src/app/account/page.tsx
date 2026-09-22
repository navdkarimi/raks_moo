import type { Metadata } from "next";
import { AuthShell } from "../../features/auth/auth-shell";
import { AccountPanel } from "../../features/auth/account-panel";

export const metadata: Metadata = { title: "حساب من | رقص مو" };

export default function AccountPage() {
  return (
    <AuthShell>
      <AccountPanel />
    </AuthShell>
  );
}
