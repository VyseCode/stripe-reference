import { randomBytes } from "node:crypto";
import { nextSequence } from "@/models/Counter";

export function makePid(prefix: string): string {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}

export async function nextInvoiceNumber(): Promise<string> {
  const seq = await nextSequence("invoice");
  return `INV-2026-${String(seq).padStart(4, "0")}`;
}

export function lookupFilter(key: string): Record<string, unknown> {
  return TypesObjectIdIsValid(key) ? { _id: key } : { pid: key };
}

function TypesObjectIdIsValid(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value);
}
