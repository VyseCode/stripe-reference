import { randomBytes } from "node:crypto";
import { CURRENCIES } from "@/lib/money";

export type PaymentOutcome = "success" | "failure";

export type ChargeInput = {
  amountMinor: number;
  currency: string;
  sourceRef: string;
  description: string;
  outcome: PaymentOutcome;
};

export type ChargeResult = {
  ok: boolean;
  chargeRef: string;
  failureCode?: string;
};

export type RefundInput = {
  amountMinor: number;
  currency: string;
  chargeRef: string;
};

export type RefundResult = { ok: boolean; refundRef: string };

export type PayoutInput = {
  amountMinor: number;
  currency: string;
  destination: string;
};

export type PayoutResult = { ok: boolean; payoutRef: string };

export interface PaymentGateway {
  charge(input: ChargeInput): Promise<ChargeResult>;
  refund(input: RefundInput): Promise<RefundResult>;
  payout(input: PayoutInput): Promise<PayoutResult>;
}

function validateAmount(amountMinor: number, currency: string) {
  if (!Number.isInteger(amountMinor) || amountMinor < 1) {
    throw new Error("Amount must be a positive integer in minor units");
  }
  if (!CURRENCIES.includes(currency as (typeof CURRENCIES)[number])) {
    throw new Error("Unsupported currency");
  }
}

function ref(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

export class LocalPaymentGateway implements PaymentGateway {
  async charge(input: ChargeInput): Promise<ChargeResult> {
    validateAmount(input.amountMinor, input.currency);
    const chargeRef = ref("ch");
    if (input.outcome === "failure") {
      return { ok: false, chargeRef, failureCode: "card_declined" };
    }
    return { ok: true, chargeRef };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    validateAmount(input.amountMinor, input.currency);
    return { ok: true, refundRef: ref("re") };
  }

  async payout(input: PayoutInput): Promise<PayoutResult> {
    validateAmount(input.amountMinor, input.currency);
    if (!input.destination.trim()) {
      throw new Error("A payout destination is required");
    }
    return { ok: true, payoutRef: ref("po") };
  }
}

export function getGateway(): PaymentGateway {
  return new LocalPaymentGateway();
}
