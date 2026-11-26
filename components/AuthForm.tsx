"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertIcon, ArrowIcon, CheckIcon, Mark } from "@/components/Icons";
import { inputClass, secondaryButtonClass } from "@/components/ui";

type AuthFormProps = { mode: "login" | "register" };

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isRegister = mode === "register";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const payload = isRegister
      ? {
          name: String(form.get("name") ?? ""),
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        }
      : {
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        };

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function useDemo() {
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "owner@ledgerline.dev",
          password: "password123",
        }),
      });
      if (!response.ok) {
        setError("Demo account is unavailable. Run npm run seed first.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
      <section className="relative hidden overflow-hidden bg-ink px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0 opacity-[0.06]" aria-hidden="true">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M32 0H0V32" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        <div className="relative flex items-center gap-3">
          <Mark className="h-9 w-9" />
          <span className="text-lg font-semibold tracking-tight">Ledgerline</span>
        </div>

        <div className="relative max-w-md">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
            Payments, made legible
          </p>
          <h2 className="text-[38px] font-semibold leading-[1.15] tracking-[-0.03em]">
            Every charge, subscription and payout in one clear ledger.
          </h2>
          <p className="mt-5 text-sm leading-7 text-white/65">
            A working reference implementation of a payments dashboard — customers,
            products, billing cycles, signed webhooks and a balance you can actually
            reconcile.
          </p>

          <div className="mt-10 rounded-xl border border-white/15 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-white/45">
                  Monthly recurring revenue
                </p>
                <p className="tnum mt-1.5 text-2xl font-semibold">$6,437.50</p>
              </div>
              <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                +12.4%
              </span>
            </div>
            <svg viewBox="0 0 360 80" className="mt-4 h-20 w-full" aria-hidden="true">
              <polyline
                points="0,62 30,55 60,58 90,44 120,48 150,35 180,39 210,26 240,31 270,18 300,22 330,10 360,14"
                fill="none"
                stroke="#4dd0bf"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points="0,62 30,55 60,58 90,44 120,48 150,35 180,39 210,26 240,31 270,18 300,22 330,10 360,14 360,80 0,80"
                fill="#4dd0bf"
                opacity="0.08"
              />
            </svg>
          </div>
        </div>

        <p className="relative text-xs text-white/40">
          Local reference build · all payment effects simulated
        </p>
      </section>

      <section className="flex items-center justify-center bg-paper px-5 py-10 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <Mark className="h-8 w-8" />
            <span className="text-base font-semibold tracking-tight text-ink">
              Ledgerline
            </span>
          </div>

          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
            {isRegister ? "Create your workspace" : "Welcome back"}
          </p>
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink">
            {isRegister ? "Start with Ledgerline" : "Sign in to your account"}
          </h1>
          <p className="mt-1.5 text-sm leading-6 text-inksoft">
            {isRegister
              ? "Set up an account to explore the dashboard and its workflows."
              : "Pick up where your ledger left off."}
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            {isRegister && (
              <div>
                <label htmlFor="name" className="mb-1.5 block text-xs font-semibold text-ink">
                  Full name
                </label>
                <input
                  id="name"
                  name="name"
                  required
                  minLength={2}
                  maxLength={80}
                  autoComplete="name"
                  placeholder="Jamie Ellison"
                  className={inputClass}
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-ink">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@company.com"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-ink">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={isRegister ? 8 : 1}
                autoComplete={isRegister ? "new-password" : "current-password"}
                placeholder={isRegister ? "At least 8 characters" : "Your password"}
                className={inputClass}
              />
            </div>

            {error && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-signal/20 bg-signalwash px-3 py-2.5 text-sm text-signal"
              >
                <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </p>
            )}

            <button type="submit" disabled={loading} className="w-full rounded-lg border border-accent bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accentdeep disabled:opacity-60">
              {loading
                ? "Please wait…"
                : isRegister
                  ? "Create account"
                  : "Sign in"}
              {!loading && <ArrowIcon className="ml-2 inline h-4 w-4" />}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-line" />
            <span className="text-[11px] uppercase tracking-widest text-inksoft">or</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          {!isRegister && (
            <button
              type="button"
              onClick={useDemo}
              disabled={loading}
              className={`mt-5 w-full ${secondaryButtonClass}`}
            >
              <CheckIcon className="h-4 w-4 text-accent" />
              Explore with the demo account
            </button>
          )}

          <p className="mt-7 text-center text-sm text-inksoft">
            {isRegister ? "Already have an account? " : "Need an account? "}
            <Link
              href={isRegister ? "/login" : "/register"}
              className="font-semibold text-accent hover:underline"
            >
              {isRegister ? "Sign in" : "Create one"}
            </Link>
          </p>

          {!isRegister && (
            <p className="mt-6 rounded-lg border border-line bg-surface px-4 py-3 text-center text-xs leading-5 text-inksoft">
              Demo credentials: <strong className="text-ink">owner@ledgerline.dev</strong> /{" "}
              <strong className="text-ink">password123</strong>
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
