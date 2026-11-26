import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";

const URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/stripe_ref";

const objectId = mongoose.Schema.Types.ObjectId;

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true, lowercase: true },
    password: { type: String, select: false },
    role: { type: String, default: "member", enum: ["owner", "member"] },
  },
  { timestamps: true },
);
const counterSchema = new mongoose.Schema({ _id: String, seq: Number });
const customerSchema = new mongoose.Schema(
  {
    pid: { type: String, unique: true },
    name: String,
    email: { type: String, lowercase: true },
    description: String,
    currency: { type: String, default: "usd" },
    balanceMinor: { type: Number, default: 0 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: true },
);
customerSchema.index({ email: 1 });
customerSchema.index({ createdAt: -1 });
const pmSchema = new mongoose.Schema(
  {
    pid: { type: String, unique: true },
    token: { type: String, unique: true },
    customer: { type: objectId, ref: "Customer", index: true },
    type: { type: String, default: "card" },
    brand: String,
    last4: String,
    expMonth: Number,
    expYear: Number,
    isDefault: Boolean,
  },
  { timestamps: true },
);
pmSchema.index({ customer: 1, token: 1 }, { unique: true });
const productSchema = new mongoose.Schema(
  {
    pid: { type: String, unique: true },
    name: String,
    description: String,
    active: Boolean,
    metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: true },
);
const priceSchema = new mongoose.Schema(
  {
    pid: { type: String, unique: true },
    product: { type: objectId, ref: "Product", index: true },
    unitAmountMinor: Number,
    currency: { type: String, default: "usd" },
    interval: String,
    active: Boolean,
  },
  { timestamps: true },
);
priceSchema.index({ product: 1, active: 1 });
const subscriptionSchema = new mongoose.Schema(
  {
    pid: { type: String, unique: true },
    customer: { type: objectId, ref: "Customer", index: true },
    price: { type: objectId, ref: "Price", index: true },
    status: String,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: Boolean,
    canceledAt: { type: Date, default: null },
    trialEnd: { type: Date, default: null },
  },
  { timestamps: true },
);
subscriptionSchema.index({ customer: 1, status: 1 });
subscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });
subscriptionSchema.index(
  { customer: 1, price: 1 },
  {
    unique: true,
    name: "uniq_active_customer_price",
    partialFilterExpression: { status: "active" },
  },
);
const checkoutSchema = new mongoose.Schema(
  {
    pid: { type: String, unique: true },
    customer: { type: objectId, ref: "Customer", index: true },
    price: { type: objectId, ref: "Price", index: true },
    mode: String,
    status: String,
    amountMinor: Number,
    currency: String,
    outcome: String,
    successUrl: String,
    cancelUrl: String,
    expiresAt: Date,
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
checkoutSchema.index({ status: 1, createdAt: -1 });
const webhookSchema = new mongoose.Schema(
  {
    eventId: { type: String, unique: true },
    type: String,
    payload: mongoose.Schema.Types.Mixed,
    signature: String,
    status: String,
    deliveries: { type: Number, default: 1 },
    error: { type: String, default: "" },
    receivedAt: { type: Date, default: Date.now },
    processedAt: { type: Date, default: null },
  },
  { versionKey: false },
);
webhookSchema.index({ type: 1, receivedAt: -1 });
const invoiceLineSchema = new mongoose.Schema(
  { description: String, quantity: Number, unitAmountMinor: Number, amountMinor: Number },
  { _id: true },
);
const invoiceSchema = new mongoose.Schema(
  {
    pid: { type: String, unique: true },
    number: { type: String, unique: true },
    customer: { type: objectId, ref: "Customer", index: true },
    subscription: { type: objectId, ref: "Subscription", default: null },
    status: String,
    currency: String,
    lines: [invoiceLineSchema],
    subtotalMinor: Number,
    taxMinor: Number,
    amountMinor: Number,
    periodStart: { type: Date, default: null },
    periodEnd: { type: Date, default: null },
    dueDate: { type: Date, default: null },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true },
);
invoiceSchema.index({ customer: 1, createdAt: -1 });
invoiceSchema.index({ status: 1, dueDate: -1 });
const refundSchema = new mongoose.Schema(
  {
    pid: { type: String, unique: true },
    chargeRef: { type: String, index: true },
    sourceRef: String,
    sourceAmountMinor: Number,
    amountMinor: Number,
    currency: String,
    reason: String,
    status: String,
  },
  { timestamps: true },
);
const disputeSchema = new mongoose.Schema(
  {
    pid: { type: String, unique: true },
    chargeRef: { type: String, index: true },
    amountMinor: Number,
    currency: String,
    reason: String,
    status: String,
    evidence: String,
  },
  { timestamps: true },
);
const ledgerSchema = new mongoose.Schema(
  {
    kind: String,
    amountMinor: Number,
    currency: String,
    balanceAfterMinor: Number,
    sourceRef: String,
    description: String,
  },
  { timestamps: true },
);
ledgerSchema.index({ createdAt: -1 });
ledgerSchema.index({ kind: 1, createdAt: -1 });
const payoutSchema = new mongoose.Schema(
  {
    pid: { type: String, unique: true },
    amountMinor: Number,
    currency: String,
    status: String,
    destination: String,
    arrivalDate: Date,
    paidAt: { type: Date, default: null },
  },
  { timestamps: true },
);
const apiKeySchema = new mongoose.Schema(
  {
    name: String,
    prefix: String,
    last4: String,
    masked: String,
    hash: { type: String, unique: true },
    scope: String,
    createdBy: { type: objectId, ref: "User" },
    revokedAt: { type: Date, default: null },
    lastUsedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const M = {
  User: mongoose.model("User", userSchema),
  Counter: mongoose.model("Counter", counterSchema),
  Customer: mongoose.model("Customer", customerSchema),
  PaymentMethod: mongoose.model("PaymentMethod", pmSchema),
  Product: mongoose.model("Product", productSchema),
  Price: mongoose.model("Price", priceSchema),
  Subscription: mongoose.model("Subscription", subscriptionSchema),
  CheckoutSession: mongoose.model("CheckoutSession", checkoutSchema),
  WebhookEvent: mongoose.model("WebhookEvent", webhookSchema),
  Invoice: mongoose.model("Invoice", invoiceSchema),
  Refund: mongoose.model("Refund", refundSchema),
  Dispute: mongoose.model("Dispute", disputeSchema),
  LedgerEntry: mongoose.model("LedgerEntry", ledgerSchema),
  Payout: mongoose.model("Payout", payoutSchema),
  ApiKey: mongoose.model("ApiKey", apiKeySchema),
};

const daysAgo = (n) => new Date(Date.now() - n * 86_400_000);
const daysAhead = (n) => new Date(Date.now() + n * 86_400_000);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

async function main() {
  await mongoose.connect(URI, { dbName: "stripe_ref" });
  await mongoose.connection.db.dropDatabase();
  await Promise.all(
    Object.values(M).map((model) => model.createIndexes()),
  );

  const password = await bcrypt.hash("password123", 12);
  const [owner] = await M.User.create([
    { name: "Dana Whitfield", email: "owner@ledgerline.dev", password, role: "owner" },
    { name: "Ravi Nathan", email: "admin@ledgerline.dev", password, role: "member" },
    { name: "Mira Okafor", email: "member@ledgerline.dev", password, role: "member" },
  ]);

  const customers = await M.Customer.create([
    { pid: "cust_001", name: "Harbor & Finch", email: "billing@harborfinch.com", description: "Specialty coffee roaster with three retail locations.", currency: "usd", metadata: { plan: "scale", region: "us-west" } },
    { pid: "cust_002", name: "Northwind Labs", email: "accounts@northwindlabs.io", description: "Applied research studio building climate forecasting tools.", currency: "usd", metadata: { plan: "growth" } },
    { pid: "cust_003", name: "Atelier Mira", email: "hello@ateliermira.fr", description: "Independent furniture atelier in Lyon.", currency: "eur", metadata: { region: "eu" } },
    { pid: "cust_004", name: "Fieldnote Press", email: "finance@fieldnotepress.co", description: "Independent publisher of field guides and maps.", currency: "gbp", metadata: { plan: "starter" } },
    { pid: "cust_005", name: "Cedar Health", email: "billing@cedarhealth.org", description: "Community clinic network across the Pacific Northwest.", currency: "usd", metadata: { plan: "scale" } },
    { pid: "cust_006", name: "Orbit Cartography", email: "team@orbitcartography.com", description: "Mapping platform for logistics teams.", currency: "usd", metadata: { plan: "growth" } },
    { pid: "cust_007", name: "Studio Kestrel", email: "accounts@studiokestrel.design", description: "Brand and product design consultancy.", currency: "usd", metadata: { plan: "starter" } },
    { pid: "cust_008", name: "Marlow Books", email: "billing@marlowbooks.com", description: "Online bookseller focused on rare editions.", currency: "gbp", metadata: { plan: "growth" } },
  ]);
  const [c1, c2, c3, c4, c5, c6, c7, c8] = customers;

  await M.PaymentMethod.create([
    { pid: "pm_001", token: "pm_tok_harbor_visa", customer: c1._id, brand: "visa", last4: "4242", expMonth: 8, expYear: 2029, isDefault: true },
    { pid: "pm_002", token: "pm_tok_harbor_amex", customer: c1._id, brand: "amex", last4: "1005", expMonth: 3, expYear: 2028, isDefault: false },
    { pid: "pm_003", token: "pm_tok_northwind_mc", customer: c2._id, brand: "mastercard", last4: "5556", expMonth: 11, expYear: 2030, isDefault: true },
    { pid: "pm_004", token: "pm_tok_atelier_visa", customer: c3._id, brand: "visa", last4: "8210", expMonth: 5, expYear: 2027, isDefault: true },
    { pid: "pm_005", token: "pm_tok_fieldnote_mc", customer: c4._id, brand: "mastercard", last4: "4444", expMonth: 2, expYear: 2028, isDefault: true },
    { pid: "pm_006", token: "pm_tok_cedar_visa", customer: c5._id, brand: "visa", last4: "9292", expMonth: 9, expYear: 2029, isDefault: true },
    { pid: "pm_007", token: "pm_tok_orbit_amex", customer: c6._id, brand: "amex", last4: "3011", expMonth: 6, expYear: 2031, isDefault: true },
    { pid: "pm_008", token: "pm_tok_kestrel_visa", customer: c7._id, brand: "visa", last4: "6060", expMonth: 1, expYear: 2028, isDefault: true },
    { pid: "pm_009", token: "pm_tok_marlow_mc", customer: c8._id, brand: "mastercard", last4: "7712", expMonth: 4, expYear: 2029, isDefault: true },
    { pid: "pm_010", token: "pm_tok_northwind_backup", customer: c2._id, brand: "visa", last4: "1881", expMonth: 12, expYear: 2027, isDefault: false },
  ]);

  const products = await M.Product.create([
    { pid: "prod_001", name: "Atlas Analytics", description: "Usage analytics and cohort reporting for product teams.", active: true, metadata: { family: "software" } },
    { pid: "prod_002", name: "Fieldguide Onboarding", description: "A guided setup kit with templates and a launch checklist.", active: true, metadata: { family: "services" } },
    { pid: "prod_003", name: "Beacon Support", description: "Priority support with a named response contact.", active: true, metadata: { family: "services" } },
    { pid: "prod_004", name: "Ledger Export", description: "One-time historical data export in CSV or JSON.", active: false, metadata: { family: "software" } },
  ]);
  const [p1, p2, p3, p4] = products;

  const prices = await M.Price.create([
    { pid: "price_001", product: p1._id, unitAmountMinor: 4900, currency: "usd", interval: "month", active: true },
    { pid: "price_002", product: p1._id, unitAmountMinor: 49900, currency: "usd", interval: "year", active: true },
    { pid: "price_003", product: p2._id, unitAmountMinor: 9900, currency: "usd", interval: "one_time", active: true },
    { pid: "price_004", product: p3._id, unitAmountMinor: 12900, currency: "usd", interval: "month", active: true },
    { pid: "price_005", product: p3._id, unitAmountMinor: 129000, currency: "usd", interval: "year", active: true },
    { pid: "price_006", product: p4._id, unitAmountMinor: 25000, currency: "usd", interval: "one_time", active: false },
    { pid: "price_007", product: p2._id, unitAmountMinor: 8900, currency: "eur", interval: "one_time", active: true },
  ]);
  const [price1, price2, price3, price4, price5, price6, price7] = prices;

  const subscriptions = await M.Subscription.create([
    { pid: "sub_001", customer: c1._id, price: price1._id, status: "active", currentPeriodStart: daysAgo(12), currentPeriodEnd: daysAhead(18), cancelAtPeriodEnd: false, canceledAt: null, trialEnd: null },
    { pid: "sub_002", customer: c2._id, price: price2._id, status: "trialing", currentPeriodStart: daysAgo(4), currentPeriodEnd: daysAhead(26), cancelAtPeriodEnd: false, canceledAt: null, trialEnd: daysAhead(10) },
    { pid: "sub_003", customer: c3._id, price: price1._id, status: "past_due", currentPeriodStart: daysAgo(40), currentPeriodEnd: daysAgo(10), cancelAtPeriodEnd: false, canceledAt: null, trialEnd: null },
    { pid: "sub_004", customer: c4._id, price: price4._id, status: "canceled", currentPeriodStart: daysAgo(90), currentPeriodEnd: daysAgo(60), cancelAtPeriodEnd: false, canceledAt: daysAgo(60), trialEnd: null },
    { pid: "sub_005", customer: c5._id, price: price1._id, status: "active", currentPeriodStart: daysAgo(20), currentPeriodEnd: daysAhead(10), cancelAtPeriodEnd: true, canceledAt: null, trialEnd: null },
    { pid: "sub_006", customer: c6._id, price: price5._id, status: "active", currentPeriodStart: daysAgo(60), currentPeriodEnd: daysAhead(50), cancelAtPeriodEnd: false, canceledAt: null, trialEnd: null },
  ]);
  const [sub1, sub2, sub3, sub4, sub5, sub6] = subscriptions;

  const invoiceSpecs = [
    { n: 1, c: c1, s: sub1, status: "paid", amount: 4900, days: 12, due: -2, paid: -10, desc: "Atlas Analytics — monthly" },
    { n: 2, c: c2, s: sub2, status: "open", amount: 49900, days: 4, due: 8, paid: null, desc: "Atlas Analytics — annual" },
    { n: 3, c: c3, s: sub3, status: "open", amount: 4900, days: 10, due: -1, paid: null, desc: "Atlas Analytics — monthly" },
    { n: 4, c: c4, s: sub4, status: "void", amount: 12900, days: 62, due: -30, paid: null, desc: "Beacon Support — monthly" },
    { n: 5, c: c5, s: sub5, status: "paid", amount: 4900, days: 20, due: -5, paid: -18, desc: "Atlas Analytics — monthly" },
    { n: 6, c: c6, s: sub6, status: "paid", amount: 129000, days: 60, due: -20, paid: -55, desc: "Beacon Support — annual" },
    { n: 7, c: c1, s: null, status: "draft", amount: 9900, days: 1, due: null, paid: null, desc: "Fieldguide Onboarding — setup kit" },
    { n: 8, c: c7, s: null, status: "paid", amount: 9900, days: 15, due: -8, paid: -12, desc: "Fieldguide Onboarding — setup kit" },
    { n: 9, c: c8, s: null, status: "uncollectible", amount: 19800, days: 48, due: -30, paid: null, desc: "Beacon Support — two months" },
    { n: 10, c: c2, s: sub2, status: "paid", amount: 49900, days: 34, due: -20, paid: -30, desc: "Atlas Analytics — annual" },
    { n: 11, c: c5, s: sub5, status: "open", amount: 4900, days: 2, due: 12, paid: null, desc: "Atlas Analytics — monthly" },
    { n: 12, c: c6, s: null, status: "draft", amount: 25000, days: 0, due: null, paid: null, desc: "Ledger Export — historical data" },
  ];
  await M.Invoice.create(
    invoiceSpecs.map((spec) => ({
      pid: `in_${String(spec.n).padStart(3, "0")}`,
      number: `INV-2026-${String(spec.n).padStart(4, "0")}`,
      customer: spec.c._id,
      subscription: spec.s?._id ?? null,
      status: spec.status,
      currency: spec.c.currency === "usd" ? "usd" : spec.c.currency,
      lines: [
        {
          description: spec.desc,
          quantity: 1,
          unitAmountMinor: spec.amount,
          amountMinor: spec.amount,
        },
      ],
      subtotalMinor: spec.amount,
      taxMinor: 0,
      amountMinor: spec.amount,
      periodStart: spec.s ? daysAgo(spec.days + 30) : null,
      periodEnd: spec.s ? daysAhead(30 - spec.days) : null,
      dueDate: spec.due === null ? null : daysAgo(-spec.due),
      paidAt: spec.paid === null ? null : daysAgo(-spec.paid),
      createdAt: daysAgo(spec.days),
    })),
  );

  await M.CheckoutSession.create([
    { pid: "cs_001", customer: c7._id, price: price3._id, mode: "payment", status: "open", amountMinor: 9900, currency: "usd", outcome: "success", successUrl: "/checkout", cancelUrl: "/checkout", expiresAt: daysAhead(1), completedAt: null, createdAt: daysAgo(1) },
    { pid: "cs_002", customer: c8._id, price: price4._id, mode: "payment", status: "complete", amountMinor: 12900, currency: "gbp", outcome: "success", successUrl: "/checkout", cancelUrl: "/checkout", expiresAt: daysAgo(2), completedAt: daysAgo(3), createdAt: daysAgo(3) },
    { pid: "cs_003", customer: c3._id, price: price7._id, mode: "payment", status: "failed", amountMinor: 8900, currency: "eur", outcome: "failure", successUrl: "/checkout", cancelUrl: "/checkout", expiresAt: daysAgo(4), completedAt: daysAgo(4), createdAt: daysAgo(5) },
    { pid: "cs_004", customer: c4._id, price: price6._id, mode: "payment", status: "expired", amountMinor: 25000, currency: "gbp", outcome: "success", successUrl: "/checkout", cancelUrl: "/checkout", expiresAt: daysAgo(8), completedAt: null, createdAt: daysAgo(11) },
    { pid: "cs_005", customer: c7._id, price: price1._id, mode: "subscription", status: "complete", amountMinor: 4900, currency: "usd", outcome: "success", successUrl: "/checkout", cancelUrl: "/checkout", expiresAt: daysAgo(6), completedAt: daysAgo(7), createdAt: daysAgo(7) },
    { pid: "cs_006", customer: c8._id, price: price2._id, mode: "subscription", status: "open", amountMinor: 49900, currency: "gbp", outcome: "success", successUrl: "/checkout", cancelUrl: "/checkout", expiresAt: daysAhead(2), completedAt: null, createdAt: daysAgo(0) },
  ]);

  await M.WebhookEvent.create([
    { eventId: "evt_001", type: "checkout.session.completed", payload: { id: "cs_002", amount_total: 12900 }, signature: "t=1,v1=seed", status: "processed", deliveries: 2, receivedAt: daysAgo(3), processedAt: daysAgo(3) },
    { eventId: "evt_002", type: "customer.created", payload: { id: "cust_008" }, signature: "t=1,v1=seed", status: "processed", deliveries: 1, receivedAt: daysAgo(6), processedAt: daysAgo(6) },
    { eventId: "evt_003", type: "invoice.paid", payload: { id: "in_006" }, signature: "t=1,v1=seed", status: "received", deliveries: 1, receivedAt: daysAgo(1), processedAt: null },
    { eventId: "evt_004", type: "payment_intent.failed", payload: { id: "cs_003", code: "card_declined" }, signature: "t=1,v1=badsig", status: "failed", error: "Signature mismatch", deliveries: 1, receivedAt: daysAgo(5), processedAt: null },
    { eventId: "evt_005", type: "customer.subscription.updated", payload: { id: "sub_005", cancel_at_period_end: true }, signature: "t=1,v1=seed", status: "processed", deliveries: 1, receivedAt: daysAgo(2), processedAt: daysAgo(2) },
  ]);

  const paidInvoices = invoiceSpecs.filter((spec) => spec.status === "paid");
  const refundSpecs = [
    { n: 1, inv: paidInvoices[0], amount: 1200, status: "succeeded", reason: "requested_by_customer" },
    { n: 2, inv: paidInvoices[2], amount: 2500, status: "succeeded", reason: "duplicate" },
    { n: 3, inv: paidInvoices[3], amount: 4900, status: "pending", reason: "requested_by_customer" },
    { n: 4, inv: paidInvoices[1], amount: 800, status: "failed", reason: "fraudulent" },
  ];
  await M.Refund.create(
    refundSpecs.map((spec) => ({
      pid: `re_${String(spec.n).padStart(3, "0")}`,
      chargeRef: `ch_in_${String(spec.inv.n).padStart(3, "0")}`,
      sourceRef: `in_${String(spec.inv.n).padStart(3, "0")}`,
      sourceAmountMinor: spec.inv.amount,
      amountMinor: spec.amount,
      currency: spec.inv.c.currency === "usd" ? "usd" : spec.inv.c.currency,
      reason: spec.reason,
      status: spec.status,
      createdAt: daysAgo(spec.n + 2),
    })),
  );

  await M.Dispute.create([
    { pid: "dp_001", chargeRef: "ch_in_006", amountMinor: 129000, currency: "usd", reason: "product_not_received", status: "open", evidence: "", createdAt: daysAgo(4) },
    { pid: "dp_002", chargeRef: "ch_in_008", amountMinor: 9900, currency: "usd", reason: "unrecognized", status: "won", evidence: "Signed delivery confirmation and IP logs provided.", createdAt: daysAgo(14) },
    { pid: "dp_003", chargeRef: "ch_in_010", amountMinor: 49900, currency: "usd", reason: "duplicate", status: "lost", evidence: "", createdAt: daysAgo(24) },
  ]);

  let balance = 0;
  const ledger = [];
  const addLedger = (kind, amountMinor, sourceRef, description, currency = "usd", createdAt = daysAgo(1)) => {
    balance += amountMinor;
    ledger.push({ kind, amountMinor, currency, balanceAfterMinor: balance, sourceRef, description, createdAt });
  };
  for (const spec of paidInvoices) {
    const pid = `in_${String(spec.n).padStart(3, "0")}`;
    const currency = spec.c.currency === "usd" ? "usd" : spec.c.currency;
    addLedger("charge", spec.amount, `ch_${pid}`, `Payment for ${spec.desc}`, currency, daysAgo(-spec.paid));
    addLedger("fee", -Math.round(spec.amount * 0.029) - 30, `fee_${pid}`, "Processing fee (2.9% + 30¢)", currency, daysAgo(-spec.paid));
  }
  for (const spec of refundSpecs) {
    if (spec.status === "succeeded") {
      addLedger("refund", -spec.amount, `re_${String(spec.n).padStart(3, "0")}`, "Refund issued to customer", spec.inv.c.currency === "usd" ? "usd" : spec.inv.c.currency, daysAgo(spec.n + 2));
    }
  }
  addLedger("dispute", -129000, "dp_001", "Dispute reserve withheld", "usd", daysAgo(4));
  addLedger("dispute", 9900, "dp_002", "Dispute won — reserve released", "usd", daysAgo(10));
  const payoutSpecs = [
    { n: 1, amount: 100000, status: "paid", days: 9 },
    { n: 2, amount: 75000, status: "pending", days: 2 },
    { n: 3, amount: 40000, status: "failed", days: 16 },
    { n: 4, amount: 150000, status: "paid", days: 30 },
  ];
  for (const spec of payoutSpecs.filter((item) => item.status === "paid")) {
    addLedger("payout", -spec.amount, `po_${String(spec.n).padStart(3, "0")}`, "Payout to bank account •• 4242", "usd", daysAgo(spec.days));
  }
  ledger.sort((a, b) => a.createdAt - b.createdAt);
  let running = 0;
  for (const entry of ledger) {
    running += entry.amountMinor;
    entry.balanceAfterMinor = running;
  }
  await M.LedgerEntry.create(ledger);
  await M.Payout.create(
    payoutSpecs.map((spec) => ({
      pid: `po_${String(spec.n).padStart(3, "0")}`,
      amountMinor: spec.amount,
      currency: "usd",
      status: spec.status,
      destination: "bank •• 4242",
      arrivalDate: daysAgo(-spec.days + 2),
      paidAt: spec.status === "paid" ? daysAgo(spec.days) : null,
      createdAt: daysAgo(spec.days),
    })),
  );

  const keySpecs = [
    { token: "ll_admin_a1b2c3d4e5f60718293a4b5c6d7e8f90", name: "Dashboard admin", scope: "admin", prefix: "ll_admin" },
    { token: "ll_write_b2c3d4e5f60718293a4b5c6d7e8f90a1", name: "Integration — write", scope: "write", prefix: "ll_write" },
    { token: "ll_read_c3d4e5f60718293a4b5c6d7e8f90a1b2", name: "Reporting — read only", scope: "read", prefix: "ll_read" },
  ];
  await M.ApiKey.create(
    keySpecs.map((spec) => ({
      name: spec.name,
      prefix: spec.prefix,
      last4: spec.token.slice(-4),
      masked: `${spec.prefix}_••••${spec.token.slice(-4)}`,
      hash: sha256(spec.token),
      scope: spec.scope,
      createdBy: owner._id,
      createdAt: daysAgo(20),
    })),
  );

  await M.Customer.updateOne({ _id: c1._id }, { $set: { balanceMinor: 3700 } });
  await M.Counter.create([
    { _id: "invoice", seq: 12 },
    { _id: "balance", seq: running },
  ]);

  const counts = {};
  for (const [name, model] of Object.entries(M)) {
    counts[name] = await model.countDocuments({});
  }
  console.log(`Seeded stripe_ref: ${JSON.stringify(counts)}`);
  console.log("Dashboard login: owner@ledgerline.dev / password123");
  console.log("API keys (full values, shown once):");
  for (const spec of keySpecs) console.log(`  ${spec.scope.padEnd(5)} ${spec.token}`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
