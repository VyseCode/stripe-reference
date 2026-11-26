import { Counter } from "@/models/Counter";
import { LedgerEntry, type LedgerKind } from "@/models/LedgerEntry";

export async function currentBalanceMinor(): Promise<number> {
  const counter = await Counter.findById("balance").lean();
  return counter?.seq ?? 0;
}

export async function addLedgerEntry({
  kind,
  amountMinor,
  currency,
  sourceRef,
  description,
}: {
  kind: LedgerKind;
  amountMinor: number;
  currency: string;
  sourceRef: string;
  description: string;
}) {
  const counter = await Counter.findByIdAndUpdate(
    "balance",
    { $inc: { seq: amountMinor } },
    { upsert: true, returnDocument: "after" },
  ).lean();
  const balanceAfterMinor = counter?.seq ?? amountMinor;

  return LedgerEntry.create({
    kind,
    amountMinor,
    currency,
    balanceAfterMinor,
    sourceRef,
    description,
  });
}
