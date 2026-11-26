import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getSession } from "@/lib/auth";

export const metadata = { title: "Create account — Ledgerline" };

export default async function RegisterPage() {
  if (await getSession()) redirect("/dashboard");
  return <AuthForm mode="register" />;
}
