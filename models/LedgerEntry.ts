import { Schema, model, models, type Model, type Types } from "mongoose";

export type LedgerKind = "charge" | "refund" | "fee" | "payout" | "dispute";

export interface ILedgerEntry {
  _id: Types.ObjectId;
  kind: LedgerKind;
  amountMinor: number;
  currency: string;
  balanceAfterMinor: number;
  sourceRef: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const ledgerEntrySchema = new Schema<ILedgerEntry>(
  {
    kind: {
      type: String,
      enum: ["charge", "refund", "fee", "payout", "dispute"],
      required: true,
    },
    amountMinor: { type: Number, required: true },
    currency: { type: String, required: true, lowercase: true, default: "usd" },
    balanceAfterMinor: { type: Number, required: true },
    sourceRef: { type: String, required: true },
    description: { type: String, required: true },
  },
  { timestamps: true },
);

ledgerEntrySchema.index({ createdAt: -1 });
ledgerEntrySchema.index({ kind: 1, createdAt: -1 });
ledgerEntrySchema.index({ sourceRef: 1 });

export const LedgerEntry: Model<ILedgerEntry> =
  (models.LedgerEntry as Model<ILedgerEntry>) ||
  model<ILedgerEntry>("LedgerEntry", ledgerEntrySchema);
