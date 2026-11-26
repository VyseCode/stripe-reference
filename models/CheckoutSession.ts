import { Schema, model, models, type Model, type Types } from "mongoose";

export type CheckoutMode = "payment" | "subscription";
export type CheckoutStatus = "open" | "complete" | "failed" | "expired";

export interface ICheckoutSession {
  _id: Types.ObjectId;
  pid: string;
  customer: Types.ObjectId;
  price: Types.ObjectId;
  mode: CheckoutMode;
  status: CheckoutStatus;
  amountMinor: number;
  currency: string;
  outcome: "success" | "failure";
  successUrl: string;
  cancelUrl: string;
  expiresAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const checkoutSessionSchema = new Schema<ICheckoutSession>(
  {
    pid: { type: String, required: true, unique: true },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    price: {
      type: Schema.Types.ObjectId,
      ref: "Price",
      required: true,
      index: true,
    },
    mode: {
      type: String,
      enum: ["payment", "subscription"],
      required: true,
    },
    status: {
      type: String,
      enum: ["open", "complete", "failed", "expired"],
      default: "open",
    },
    amountMinor: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, lowercase: true, default: "usd" },
    outcome: { type: String, enum: ["success", "failure"], default: "success" },
    successUrl: { type: String, default: "/checkout" },
    cancelUrl: { type: String, default: "/checkout" },
    expiresAt: { type: Date, required: true },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

checkoutSessionSchema.index({ status: 1, createdAt: -1 });
checkoutSessionSchema.index({ expiresAt: 1 });

export const CheckoutSession: Model<ICheckoutSession> =
  (models.CheckoutSession as Model<ICheckoutSession>) ||
  model<ICheckoutSession>("CheckoutSession", checkoutSessionSchema);
