import type { Types } from "mongoose";

type Id = Types.ObjectId | string;

function id(value: Id | null | undefined): string {
  return value ? value.toString() : "";
}

type CustomerLean = {
  _id: Types.ObjectId;
  pid: string;
  name: string;
  email: string;
  description: string;
  currency: string;
  balanceMinor: number;
  metadata?: Record<string, string>;
  createdAt: Date;
};

export function customerDTO(doc: CustomerLean) {
  return {
    id: id(doc._id),
    pid: doc.pid,
    name: doc.name,
    email: doc.email,
    description: doc.description ?? "",
    currency: doc.currency,
    balanceMinor: doc.balanceMinor ?? 0,
    metadata: doc.metadata ?? {},
    createdAt: doc.createdAt.toISOString(),
  };
}

type PaymentMethodLean = {
  _id: Types.ObjectId;
  pid: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
  customer: Id | { _id: Types.ObjectId; name: string } | null;
  createdAt: Date;
};

export function paymentMethodDTO(doc: PaymentMethodLean) {
  const customer = doc.customer;
  const populated =
    customer && typeof customer === "object" && "name" in customer ? customer : null;
  return {
    id: id(doc._id),
    pid: doc.pid,
    brand: doc.brand,
    last4: doc.last4,
    expMonth: doc.expMonth,
    expYear: doc.expYear,
    isDefault: doc.isDefault,
    customerName: populated?.name ?? "",
    createdAt: doc.createdAt.toISOString(),
  };
}

type ProductLean = {
  _id: Types.ObjectId;
  pid: string;
  name: string;
  description: string;
  active: boolean;
  createdAt: Date;
};

export function productDTO(doc: ProductLean) {
  return {
    id: id(doc._id),
    pid: doc.pid,
    name: doc.name,
    description: doc.description ?? "",
    active: doc.active,
    createdAt: doc.createdAt.toISOString(),
  };
}

type PriceLean = {
  _id: Types.ObjectId;
  pid: string;
  product: Id | { _id: Types.ObjectId; name: string } | null;
  unitAmountMinor: number;
  currency: string;
  interval: string;
  active: boolean;
  createdAt: Date;
};

export function priceDTO(doc: PriceLean) {
  const product = doc.product;
  const populated = product && typeof product === "object" && "name" in product ? product : null;
  return {
    id: id(doc._id),
    pid: doc.pid,
    productId: id(populated ? populated._id : (product as Id | null)),
    productName: populated?.name ?? "",
    unitAmountMinor: doc.unitAmountMinor,
    currency: doc.currency,
    interval: doc.interval,
    active: doc.active,
    createdAt: doc.createdAt.toISOString(),
  };
}

type SubscriptionLean = {
  _id: Types.ObjectId;
  pid: string;
  customer: Id | { _id: Types.ObjectId; name: string } | null;
  price: Id | { _id: Types.ObjectId; unitAmountMinor: number; interval: string; currency: string } | null;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  trialEnd: Date | null;
  createdAt: Date;
};

export function subscriptionDTO(doc: SubscriptionLean) {
  const customer = doc.customer;
  const price = doc.price;
  const populatedCustomer =
    customer && typeof customer === "object" && "name" in customer ? customer : null;
  const populatedPrice =
    price && typeof price === "object" && "unitAmountMinor" in price ? price : null;
  return {
    id: id(doc._id),
    pid: doc.pid,
    customerId: id(populatedCustomer ? populatedCustomer._id : (customer as Id | null)),
    customerName: populatedCustomer?.name ?? "",
    priceId: id(populatedPrice ? populatedPrice._id : (price as Id | null)),
    priceLabel: populatedPrice
      ? `${populatedPrice.unitAmountMinor} ${populatedPrice.currency.toUpperCase()} / ${populatedPrice.interval}`
      : "",
    status: doc.status,
    currentPeriodStart: doc.currentPeriodStart.toISOString(),
    currentPeriodEnd: doc.currentPeriodEnd.toISOString(),
    cancelAtPeriodEnd: doc.cancelAtPeriodEnd,
    canceledAt: doc.canceledAt?.toISOString() ?? null,
    trialEnd: doc.trialEnd?.toISOString() ?? null,
    createdAt: doc.createdAt.toISOString(),
  };
}

type CheckoutLean = {
  _id: Types.ObjectId;
  pid: string;
  customer: Id | { _id: Types.ObjectId; name: string } | null;
  price: Id | { _id: Types.ObjectId; unitAmountMinor: number; currency: string } | null;
  mode: string;
  status: string;
  amountMinor: number;
  currency: string;
  outcome: string;
  expiresAt: Date;
  completedAt: Date | null;
  createdAt: Date;
};

export function checkoutDTO(doc: CheckoutLean) {
  const customer = doc.customer;
  const price = doc.price;
  const populatedCustomer =
    customer && typeof customer === "object" && "name" in customer ? customer : null;
  const populatedPrice =
    price && typeof price === "object" && "unitAmountMinor" in price ? price : null;
  return {
    id: id(doc._id),
    pid: doc.pid,
    customerId: id(populatedCustomer ? populatedCustomer._id : (customer as Id | null)),
    customerName: populatedCustomer?.name ?? "",
    priceId: id(populatedPrice ? populatedPrice._id : (price as Id | null)),
    amountMinor: doc.amountMinor,
    currency: doc.currency,
    mode: doc.mode,
    status: doc.status,
    outcome: doc.outcome,
    expiresAt: doc.expiresAt.toISOString(),
    completedAt: doc.completedAt?.toISOString() ?? null,
    createdAt: doc.createdAt.toISOString(),
  };
}

type InvoiceLean = {
  _id: Types.ObjectId;
  pid: string;
  number: string;
  customer: Id | { _id: Types.ObjectId; name: string } | null;
  subscription: Id | null;
  status: string;
  currency: string;
  lines: Array<{
    _id: Types.ObjectId;
    description: string;
    quantity: number;
    unitAmountMinor: number;
    amountMinor: number;
  }>;
  subtotalMinor: number;
  taxMinor: number;
  amountMinor: number;
  periodStart: Date | null;
  periodEnd: Date | null;
  dueDate: Date | null;
  paidAt: Date | null;
  createdAt: Date;
};

export function invoiceDTO(doc: InvoiceLean) {
  const customer = doc.customer;
  const populated = customer && typeof customer === "object" && "name" in customer ? customer : null;
  return {
    id: id(doc._id),
    pid: doc.pid,
    number: doc.number,
    customerId: id(populated ? populated._id : (customer as Id | null)),
    customerName: populated?.name ?? "",
    subscriptionId: id(doc.subscription),
    status: doc.status,
    currency: doc.currency,
    lines: doc.lines.map((line) => ({
      id: id(line._id),
      description: line.description,
      quantity: line.quantity,
      unitAmountMinor: line.unitAmountMinor,
      amountMinor: line.amountMinor,
    })),
    subtotalMinor: doc.subtotalMinor,
    taxMinor: doc.taxMinor,
    amountMinor: doc.amountMinor,
    periodStart: doc.periodStart?.toISOString() ?? null,
    periodEnd: doc.periodEnd?.toISOString() ?? null,
    dueDate: doc.dueDate?.toISOString() ?? null,
    paidAt: doc.paidAt?.toISOString() ?? null,
    createdAt: doc.createdAt.toISOString(),
  };
}

type RefundLean = {
  _id: Types.ObjectId;
  pid: string;
  chargeRef: string;
  sourceRef: string;
  amountMinor: number;
  currency: string;
  reason: string;
  status: string;
  createdAt: Date;
};

export function refundDTO(doc: RefundLean) {
  return {
    id: id(doc._id),
    pid: doc.pid,
    chargeRef: doc.chargeRef,
    sourceRef: doc.sourceRef,
    amountMinor: doc.amountMinor,
    currency: doc.currency,
    reason: doc.reason,
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
  };
}

type DisputeLean = {
  _id: Types.ObjectId;
  pid: string;
  chargeRef: string;
  amountMinor: number;
  currency: string;
  reason: string;
  status: string;
  evidence: string;
  createdAt: Date;
};

export function disputeDTO(doc: DisputeLean) {
  return {
    id: id(doc._id),
    pid: doc.pid,
    chargeRef: doc.chargeRef,
    amountMinor: doc.amountMinor,
    currency: doc.currency,
    reason: doc.reason,
    status: doc.status,
    evidence: doc.evidence ?? "",
    createdAt: doc.createdAt.toISOString(),
  };
}

type LedgerLean = {
  _id: Types.ObjectId;
  kind: string;
  amountMinor: number;
  currency: string;
  balanceAfterMinor: number;
  sourceRef: string;
  description: string;
  createdAt: Date;
};

export function ledgerDTO(doc: LedgerLean) {
  return {
    id: id(doc._id),
    kind: doc.kind,
    amountMinor: doc.amountMinor,
    currency: doc.currency,
    balanceAfterMinor: doc.balanceAfterMinor,
    sourceRef: doc.sourceRef,
    description: doc.description,
    createdAt: doc.createdAt.toISOString(),
  };
}

type PayoutLean = {
  _id: Types.ObjectId;
  pid: string;
  amountMinor: number;
  currency: string;
  status: string;
  destination: string;
  arrivalDate: Date;
  paidAt: Date | null;
  createdAt: Date;
};

export function payoutDTO(doc: PayoutLean) {
  return {
    id: id(doc._id),
    pid: doc.pid,
    amountMinor: doc.amountMinor,
    currency: doc.currency,
    status: doc.status,
    destination: doc.destination,
    arrivalDate: doc.arrivalDate.toISOString(),
    paidAt: doc.paidAt?.toISOString() ?? null,
    createdAt: doc.createdAt.toISOString(),
  };
}

type ApiKeyLean = {
  _id: Types.ObjectId;
  name: string;
  prefix: string;
  masked: string;
  scope: string;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
};

export function apiKeyDTO(doc: ApiKeyLean) {
  return {
    id: id(doc._id),
    name: doc.name,
    prefix: doc.prefix,
    masked: doc.masked,
    scope: doc.scope,
    revokedAt: doc.revokedAt?.toISOString() ?? null,
    lastUsedAt: doc.lastUsedAt?.toISOString() ?? null,
    createdAt: doc.createdAt.toISOString(),
  };
}

type WebhookLean = {
  _id: Types.ObjectId;
  eventId: string;
  type: string;
  payload: Record<string, unknown>;
  status: string;
  deliveries: number;
  error: string;
  receivedAt: Date;
  processedAt: Date | null;
};

export function webhookDTO(doc: WebhookLean) {
  return {
    id: id(doc._id),
    eventId: doc.eventId,
    type: doc.type,
    payload: doc.payload,
    status: doc.status,
    deliveries: doc.deliveries ?? 1,
    error: doc.error ?? "",
    receivedAt: doc.receivedAt.toISOString(),
    processedAt: doc.processedAt?.toISOString() ?? null,
  };
}
