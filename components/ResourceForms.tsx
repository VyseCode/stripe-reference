"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertIcon, CloseIcon, PlusIcon } from "@/components/Icons";
import {
  buttonClass,
  secondaryButtonClass,
  inputClass,
} from "@/components/ui";
import { CURRENCIES } from "@/lib/money";

type Result = { ok: boolean; data: Record<string, unknown> };

async function send(
  url: string,
  method: string,
  body?: Record<string, unknown>,
): Promise<Result> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await response.json()) as Record<string, unknown>;
  return { ok: response.ok, data };
}

function errorMessage(data: Record<string, unknown>): string {
  return typeof data.error === "string" ? data.error : "Something went wrong.";
}

function Panel({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(20,33,43,0.04)]">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-inksoft hover:bg-paper"
          aria-label="Close form"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>
      {children}
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="mt-3 flex items-start gap-2 rounded-lg border border-signal/20 bg-signalwash px-3 py-2 text-xs text-signal"
    >
      <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
      {message}
    </p>
  );
}

function OpenButton({
  open,
  label,
  onClick,
}: {
  open: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={buttonClass}>
      <PlusIcon className="h-4 w-4" />
      {open ? "Close" : label}
    </button>
  );
}

export function NewCustomerForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await send("/api/customers", "POST", {
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        description: String(form.get("description") ?? ""),
        currency: String(form.get("currency") ?? "usd"),
      });
      if (!result.ok) {
        setError(errorMessage(result.data));
        return;
      }
      event.currentTarget.reset();
      setOpen(false);
      router.refresh();
    } catch {
      setError("Unable to reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <OpenButton open={open} label="New customer" onClick={() => setOpen(!open)} />
      <Panel open={open} title="Add a customer" onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="cust-name" className="mb-1.5 block text-xs font-semibold text-ink">Name</label>
            <input id="cust-name" name="name" required minLength={2} className={inputClass} placeholder="Harbor & Finch" />
          </div>
          <div>
            <label htmlFor="cust-email" className="mb-1.5 block text-xs font-semibold text-ink">Billing email</label>
            <input id="cust-email" name="email" type="email" required className={inputClass} placeholder="billing@company.com" />
          </div>
          <div>
            <label htmlFor="cust-currency" className="mb-1.5 block text-xs font-semibold text-ink">Currency</label>
            <select id="cust-currency" name="currency" className={inputClass}>
              {CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>{currency.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="cust-description" className="mb-1.5 block text-xs font-semibold text-ink">Notes</label>
            <input id="cust-description" name="description" className={inputClass} placeholder="What does this customer do?" />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={busy} className={buttonClass}>
              {busy ? "Saving…" : "Create customer"}
            </button>
            <ErrorNote message={error} />
          </div>
        </form>
      </Panel>
    </>
  );
}

export function NewProductForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await send("/api/products", "POST", {
        name: String(form.get("name") ?? ""),
        description: String(form.get("description") ?? ""),
        active: true,
      });
      if (!result.ok) {
        setError(errorMessage(result.data));
        return;
      }
      event.currentTarget.reset();
      setOpen(false);
      router.refresh();
    } catch {
      setError("Unable to reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <OpenButton open={open} label="New product" onClick={() => setOpen(!open)} />
      <Panel open={open} title="Add a product" onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="grid gap-4">
          <div>
            <label htmlFor="prod-name" className="mb-1.5 block text-xs font-semibold text-ink">Product name</label>
            <input id="prod-name" name="name" required minLength={2} className={inputClass} placeholder="Atlas Analytics" />
          </div>
          <div>
            <label htmlFor="prod-description" className="mb-1.5 block text-xs font-semibold text-ink">Description</label>
            <input id="prod-description" name="description" className={inputClass} placeholder="One sentence about what it does" />
          </div>
          <div>
            <button type="submit" disabled={busy} className={buttonClass}>
              {busy ? "Saving…" : "Create product"}
            </button>
            <ErrorNote message={error} />
          </div>
        </form>
      </Panel>
    </>
  );
}

export function NewPriceForm({
  products,
}: {
  products: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await send("/api/prices", "POST", {
        product: String(form.get("product") ?? ""),
        unitAmountMinor: Math.round(Number(form.get("amount")) * 100),
        currency: String(form.get("currency") ?? "usd"),
        interval: String(form.get("interval") ?? "month"),
      });
      if (!result.ok) {
        setError(errorMessage(result.data));
        return;
      }
      event.currentTarget.reset();
      setOpen(false);
      router.refresh();
    } catch {
      setError("Unable to reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <OpenButton open={open} label="New price" onClick={() => setOpen(!open)} />
      <Panel open={open} title="Add a price" onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="price-product" className="mb-1.5 block text-xs font-semibold text-ink">Product</label>
            <select id="price-product" name="product" required className={inputClass} defaultValue="">
              <option value="" disabled>Choose a product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="price-amount" className="mb-1.5 block text-xs font-semibold text-ink">Amount</label>
            <input id="price-amount" name="amount" type="number" min="0" step="0.01" required className={inputClass} placeholder="49.00" />
          </div>
          <div>
            <label htmlFor="price-interval" className="mb-1.5 block text-xs font-semibold text-ink">Billing interval</label>
            <select id="price-interval" name="interval" className={inputClass}>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
              <option value="one_time">One-time</option>
            </select>
          </div>
          <div>
            <label htmlFor="price-currency" className="mb-1.5 block text-xs font-semibold text-ink">Currency</label>
            <select id="price-currency" name="currency" className={inputClass}>
              {CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>{currency.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={busy} className={buttonClass}>
              {busy ? "Saving…" : "Create price"}
            </button>
            <ErrorNote message={error} />
          </div>
        </form>
      </Panel>
    </>
  );
}

export function NewPaymentMethodForm({
  customerId,
  customerName,
}: {
  customerId: string;
  customerName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await send("/api/payment-methods", "POST", {
        customer: customerId,
        brand: String(form.get("brand") ?? "visa"),
        last4: String(form.get("last4") ?? ""),
        expMonth: Number(form.get("expMonth")),
        expYear: Number(form.get("expYear")),
      });
      if (!result.ok) {
        setError(errorMessage(result.data));
        return;
      }
      event.currentTarget.reset();
      setOpen(false);
      router.refresh();
    } catch {
      setError("Unable to reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(!open)} className={secondaryButtonClass}>
        <PlusIcon className="h-4 w-4" />
        Add card for {customerName.split(" ")[0]}
      </button>
      <Panel open={open} title="Tokenize a simulated card" onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pm-brand" className="mb-1.5 block text-xs font-semibold text-ink">Brand</label>
            <select id="pm-brand" name="brand" className={inputClass}>
              <option value="visa">Visa</option>
              <option value="mastercard">Mastercard</option>
              <option value="amex">Amex</option>
            </select>
          </div>
          <div>
            <label htmlFor="pm-last4" className="mb-1.5 block text-xs font-semibold text-ink">Last 4 digits</label>
            <input id="pm-last4" name="last4" required pattern="\d{4}" maxLength={4} className={inputClass} placeholder="4242" />
          </div>
          <div>
            <label htmlFor="pm-month" className="mb-1.5 block text-xs font-semibold text-ink">Expiry month</label>
            <input id="pm-month" name="expMonth" type="number" min={1} max={12} required className={inputClass} placeholder="8" />
          </div>
          <div>
            <label htmlFor="pm-year" className="mb-1.5 block text-xs font-semibold text-ink">Expiry year</label>
            <input id="pm-year" name="expYear" type="number" min={2024} max={2100} required className={inputClass} placeholder="2029" />
          </div>
          <div className="sm:col-span-2">
            <p className="mb-3 text-xs text-inksoft">
              This creates a local token only — no card data leaves this machine.
            </p>
            <button type="submit" disabled={busy} className={buttonClass}>
              {busy ? "Tokenizing…" : "Create token"}
            </button>
            <ErrorNote message={error} />
          </div>
        </form>
      </Panel>
    </>
  );
}

export function NewApiKeyForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await send("/api/api-keys", "POST", {
        name: String(form.get("name") ?? ""),
        scope: String(form.get("scope") ?? "read"),
      });
      if (!result.ok) {
        setError(errorMessage(result.data));
        return;
      }
      setToken(typeof result.data.token === "string" ? result.data.token : "");
      event.currentTarget.reset();
      router.refresh();
    } catch {
      setError("Unable to reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <OpenButton open={open} label="Create key" onClick={() => setOpen(!open)} />
      <Panel open={open} title="Create an API key" onClose={() => { setOpen(false); setToken(""); }}>
        {token ? (
          <div className="rounded-lg border border-accent/30 bg-accentwash p-4">
            <p className="text-xs font-semibold text-accentdeep">Copy this token now</p>
            <code className="tnum mt-2 block break-all text-sm text-ink">{token}</code>
            <p className="mt-2 text-xs text-inksoft">
              It is shown only once. The stored value is a SHA-256 hash.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-4">
            <div>
              <label htmlFor="key-name" className="mb-1.5 block text-xs font-semibold text-ink">Key name</label>
              <input id="key-name" name="name" required minLength={2} className={inputClass} placeholder="Reporting service" />
            </div>
            <div>
              <label htmlFor="key-scope" className="mb-1.5 block text-xs font-semibold text-ink">Scope</label>
              <select id="key-scope" name="scope" className={inputClass}>
                <option value="read">Read — reporting only</option>
                <option value="write">Write — create and update</option>
                <option value="admin">Admin — all routes</option>
              </select>
            </div>
            <div>
              <button type="submit" disabled={busy} className={buttonClass}>
                {busy ? "Creating…" : "Create key"}
              </button>
              <ErrorNote message={error} />
            </div>
          </form>
        )}
      </Panel>
    </>
  );
}

export function NewSubscriptionForm({
  customers,
  prices,
}: {
  customers: Array<{ id: string; name: string }>;
  prices: Array<{ id: string; label: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await send("/api/subscriptions", "POST", {
        customer: String(form.get("customer") ?? ""),
        price: String(form.get("price") ?? ""),
        status: String(form.get("status") ?? "active"),
      });
      if (!result.ok) {
        setError(errorMessage(result.data));
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Unable to reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <OpenButton open={open} label="New subscription" onClick={() => setOpen(!open)} />
      <Panel open={open} title="Start a subscription" onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="sub-customer" className="mb-1.5 block text-xs font-semibold text-ink">Customer</label>
            <select id="sub-customer" name="customer" required defaultValue="" className={inputClass}>
              <option value="" disabled>Choose a customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sub-price" className="mb-1.5 block text-xs font-semibold text-ink">Recurring price</label>
            <select id="sub-price" name="price" required defaultValue="" className={inputClass}>
              <option value="" disabled>Choose a price</option>
              {prices.map((price) => (
                <option key={price.id} value={price.id}>{price.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sub-status" className="mb-1.5 block text-xs font-semibold text-ink">Starting status</label>
            <select id="sub-status" name="status" className={inputClass}>
              <option value="active">Active</option>
              <option value="trialing">Trialing</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={busy} className={buttonClass}>
              {busy ? "Creating…" : "Create subscription"}
            </button>
            <ErrorNote message={error} />
          </div>
        </form>
      </Panel>
    </>
  );
}

export function NewCheckoutForm({
  customers,
  prices,
}: {
  customers: Array<{ id: string; name: string }>;
  prices: Array<{ id: string; label: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await send("/api/checkout/sessions", "POST", {
        customer: String(form.get("customer") ?? ""),
        price: String(form.get("price") ?? ""),
        outcome: String(form.get("outcome") ?? "success"),
      });
      if (!result.ok) {
        setError(errorMessage(result.data));
        return;
      }
      const data = result.data.checkoutSession as { id: string };
      setOpen(false);
      router.push(`/checkout/${data.id}`);
      router.refresh();
    } catch {
      setError("Unable to reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <OpenButton open={open} label="New checkout" onClick={() => setOpen(!open)} />
      <Panel open={open} title="Create a checkout session" onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="co-customer" className="mb-1.5 block text-xs font-semibold text-ink">Customer</label>
            <select id="co-customer" name="customer" required defaultValue="" className={inputClass}>
              <option value="" disabled>Choose a customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="co-price" className="mb-1.5 block text-xs font-semibold text-ink">Price</label>
            <select id="co-price" name="price" required defaultValue="" className={inputClass}>
              <option value="" disabled>Choose a price</option>
              {prices.map((price) => (
                <option key={price.id} value={price.id}>{price.label}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="co-outcome" className="mb-1.5 block text-xs font-semibold text-ink">Simulated result</label>
            <select id="co-outcome" name="outcome" className={inputClass}>
              <option value="success">Success — create an invoice and ledger entries</option>
              <option value="failure">Failure — no charge, no invoice</option>
            </select>
            <p className="mt-1.5 text-xs text-inksoft">
              This controls the local payment adapter. No external service is contacted.
            </p>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={busy} className={buttonClass}>
              {busy ? "Creating…" : "Create checkout session"}
            </button>
            <ErrorNote message={error} />
          </div>
        </form>
      </Panel>
    </>
  );
}

export function CompleteCheckout({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function complete(outcome: "success" | "failure") {
    setBusy(outcome);
    setError("");
    try {
      const result = await send(`/api/checkout/sessions/${sessionId}/complete`, "POST", { outcome });
      if (!result.ok) {
        setError(errorMessage(result.data));
        return;
      }
      router.refresh();
    } catch {
      setError("Unable to reach the server.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy !== ""} onClick={() => complete("success")} className={buttonClass}>
          Complete with success
        </button>
        <button type="button" disabled={busy !== ""} onClick={() => complete("failure")} className={secondaryButtonClass}>
          Simulate failure
        </button>
      </div>
      <ErrorNote message={error} />
    </div>
  );
}

export function NewInvoiceForm({
  customers,
}: {
  customers: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const amount = Math.round(Number(form.get("amount")) * 100);
    try {
      const result = await send("/api/invoices", "POST", {
        customer: String(form.get("customer") ?? ""),
        lines: [
          {
            description: String(form.get("description") || "Services"),
            quantity: 1,
            unitAmountMinor: amount,
          },
        ],
        taxRateBps: Number(form.get("taxRateBps") ?? 0),
      });
      if (!result.ok) {
        setError(errorMessage(result.data));
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Unable to reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <OpenButton open={open} label="New invoice" onClick={() => setOpen(!open)} />
      <Panel open={open} title="Create an invoice" onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="inv-customer" className="mb-1.5 block text-xs font-semibold text-ink">Customer</label>
            <select id="inv-customer" name="customer" required defaultValue="" className={inputClass}>
              <option value="" disabled>Choose a customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="inv-description" className="mb-1.5 block text-xs font-semibold text-ink">Line item</label>
            <input id="inv-description" name="description" className={inputClass} placeholder="Consulting — October" />
          </div>
          <div>
            <label htmlFor="inv-amount" className="mb-1.5 block text-xs font-semibold text-ink">Amount</label>
            <input id="inv-amount" name="amount" type="number" min="0.01" step="0.01" required className={inputClass} placeholder="125.00" />
          </div>
          <div>
            <label htmlFor="inv-tax" className="mb-1.5 block text-xs font-semibold text-ink">Tax rate (basis points)</label>
            <input id="inv-tax" name="taxRateBps" type="number" min={0} max={10000} step={1} className={inputClass} placeholder="850" />
            <p className="mt-1 text-xs text-inksoft">850 = 8.5%. Tax is allocated in integer minor units.</p>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={busy} className={buttonClass}>
              {busy ? "Creating…" : "Create invoice"}
            </button>
            <ErrorNote message={error} />
          </div>
        </form>
      </Panel>
    </>
  );
}

export function NewRefundForm({
  invoices,
}: {
  invoices: Array<{ id: string; label: string; refundableMinor: number }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await send("/api/refunds", "POST", {
        invoice: String(form.get("invoice") ?? ""),
        amountMinor: Math.round(Number(form.get("amount")) * 100),
        reason: String(form.get("reason") ?? "requested_by_customer"),
      });
      if (!result.ok) {
        setError(errorMessage(result.data));
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Unable to reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <OpenButton open={open} label="New refund" onClick={() => setOpen(!open)} />
      <Panel open={open} title="Issue a refund" onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="refund-invoice" className="mb-1.5 block text-xs font-semibold text-ink">Invoice</label>
            <select id="refund-invoice" name="invoice" required defaultValue="" className={inputClass}>
              <option value="" disabled>Choose an invoice</option>
              {invoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>{invoice.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="refund-amount" className="mb-1.5 block text-xs font-semibold text-ink">Amount</label>
            <input id="refund-amount" name="amount" type="number" min="0.01" step="0.01" required className={inputClass} placeholder="12.00" />
          </div>
          <div>
            <label htmlFor="refund-reason" className="mb-1.5 block text-xs font-semibold text-ink">Reason</label>
            <select id="refund-reason" name="reason" className={inputClass}>
              <option value="requested_by_customer">Requested by customer</option>
              <option value="duplicate">Duplicate charge</option>
              <option value="fraudulent">Fraudulent</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={busy} className={buttonClass}>
              {busy ? "Refunding…" : "Issue refund"}
            </button>
            <ErrorNote message={error} />
          </div>
        </form>
      </Panel>
    </>
  );
}

export function NewDisputeForm({
  invoices,
}: {
  invoices: Array<{ id: string; label: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await send("/api/disputes", "POST", {
        invoice: String(form.get("invoice") ?? ""),
        amountMinor: Math.round(Number(form.get("amount")) * 100),
        reason: String(form.get("reason") ?? "product_not_received"),
      });
      if (!result.ok) {
        setError(errorMessage(result.data));
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Unable to reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <OpenButton open={open} label="New dispute" onClick={() => setOpen(!open)} />
      <Panel open={open} title="Open a dispute" onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="dispute-invoice" className="mb-1.5 block text-xs font-semibold text-ink">Invoice</label>
            <select id="dispute-invoice" name="invoice" required defaultValue="" className={inputClass}>
              <option value="" disabled>Choose an invoice</option>
              {invoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>{invoice.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dispute-amount" className="mb-1.5 block text-xs font-semibold text-ink">Amount</label>
            <input id="dispute-amount" name="amount" type="number" min="0.01" step="0.01" required className={inputClass} placeholder="49.00" />
          </div>
          <div>
            <label htmlFor="dispute-reason" className="mb-1.5 block text-xs font-semibold text-ink">Reason</label>
            <select id="dispute-reason" name="reason" className={inputClass}>
              <option value="product_not_received">Product not received</option>
              <option value="unrecognized">Unrecognized charge</option>
              <option value="duplicate">Duplicate</option>
              <option value="fraudulent">Fraudulent</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={busy} className={buttonClass}>
              {busy ? "Opening…" : "Open dispute"}
            </button>
            <ErrorNote message={error} />
          </div>
        </form>
      </Panel>
    </>
  );
}

export function NewPayoutForm({ availableMinor }: { availableMinor: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await send("/api/payouts", "POST", {
        amountMinor: Math.round(Number(form.get("amount")) * 100),
        destination: String(form.get("destination") || "bank •• 4242"),
      });
      if (!result.ok) {
        setError(errorMessage(result.data));
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Unable to reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(!open)} className={buttonClass}>
        <PlusIcon className="h-4 w-4" />
        New payout
      </button>
      <Panel open={open} title="Schedule a payout" onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="grid gap-4">
          <p className="text-xs text-inksoft">
            Available to pay out: {(availableMinor / 100).toFixed(2)}
          </p>
          <div>
            <label htmlFor="payout-amount" className="mb-1.5 block text-xs font-semibold text-ink">Amount</label>
            <input id="payout-amount" name="amount" type="number" min="0.01" step="0.01" required className={inputClass} placeholder="250.00" />
          </div>
          <div>
            <label htmlFor="payout-destination" className="mb-1.5 block text-xs font-semibold text-ink">Destination</label>
            <input id="payout-destination" name="destination" className={inputClass} defaultValue="bank •• 4242" />
          </div>
          <div>
            <button type="submit" disabled={busy} className={buttonClass}>
              {busy ? "Scheduling…" : "Schedule payout"}
            </button>
            <ErrorNote message={error} />
          </div>
        </form>
      </Panel>
    </>
  );
}

export function RowAction({
  url,
  method,
  label,
  variant = "secondary",
  body,
}: {
  url: string;
  method: "POST" | "PATCH" | "DELETE";
  label: string;
  variant?: "secondary" | "primary";
  body?: Record<string, unknown>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setBusy(true);
    setError("");
    try {
      const result = await send(url, method, body);
      if (!result.ok) {
        setError(errorMessage(result.data));
        return;
      }
      router.refresh();
    } catch {
      setError("Unable to reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className={
          variant === "primary"
            ? "rounded-md border border-accent/30 bg-accentwash px-2.5 py-1.5 text-xs font-semibold text-accentdeep hover:bg-accent/15 disabled:opacity-50"
            : "rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-paper disabled:opacity-50"
        }
      >
        {busy ? "Working…" : label}
      </button>
      {error && <span className="mt-1 max-w-[180px] text-right text-[11px] text-signal">{error}</span>}
    </span>
  );
}
