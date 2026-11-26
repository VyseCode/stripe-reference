import { Schema, model, models, type Model, type Types } from "mongoose";

export type RefundStatus = "pending" | "succeeded" | "failed";

export interface IRefund {
  _id: Types.ObjectId;
  pid: string;
  chargeRef: string;
  sourceRef: string;
  sourceAmountMinor: number;
  amountMinor: number;
  currency: string;
  reason: string;
  status: RefundStatus;
  createdAt: Date;
  updatedAt: Date;
}

const refundSchema = new Schema<IRefund>(
  {
    pid: { type: String, required: true, unique: true },
    chargeRef: { type: String, required: true, index: true },
    sourceRef: { type: String, required: true, index: true },
    sourceAmountMinor: { type: Number, required: true, min: 0 },
    amountMinor: { type: Number, required: true, min: 1 },
    currency: { type: String, required: true, lowercase: true, default: "usd" },
    reason: {
      type: String,
      enum: ["requested_by_customer", "duplicate", "fraudulent"],
      default: "requested_by_customer",
    },
    status: {
      type: String,
      enum: ["pending", "succeeded", "failed"],
      default: "succeeded",
    },
  },
  { timestamps: true },
);

refundSchema.index({ status: 1, createdAt: -1 });
refundSchema.index({ chargeRef: 1, status: 1 });

export const Refund: Model<IRefund> =
  (models.Refund as Model<IRefund>) ||
  model<IRefund>("Refund", refundSchema);
