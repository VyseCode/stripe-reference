import { Schema, model, models, type Model, type Types } from "mongoose";

export type PayoutStatus = "pending" | "paid" | "failed";

export interface IPayout {
  _id: Types.ObjectId;
  pid: string;
  amountMinor: number;
  currency: string;
  status: PayoutStatus;
  destination: string;
  arrivalDate: Date;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const payoutSchema = new Schema<IPayout>(
  {
    pid: { type: String, required: true, unique: true },
    amountMinor: { type: Number, required: true, min: 1 },
    currency: { type: String, required: true, lowercase: true, default: "usd" },
    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    destination: { type: String, default: "bank •• 4242" },
    arrivalDate: { type: Date, required: true },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true },
);

payoutSchema.index({ status: 1, createdAt: -1 });
payoutSchema.index({ arrivalDate: 1 });

export const Payout: Model<IPayout> =
  (models.Payout as Model<IPayout>) ||
  model<IPayout>("Payout", payoutSchema);
