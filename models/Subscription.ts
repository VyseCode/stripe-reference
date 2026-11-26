import { Schema, model, models, type Model, type Types } from "mongoose";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled";

export interface ISubscription {
  _id: Types.ObjectId;
  pid: string;
  customer: Types.ObjectId;
  price: Types.ObjectId;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  trialEnd: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
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
    status: {
      type: String,
      enum: ["trialing", "active", "past_due", "canceled"],
      required: true,
      default: "active",
    },
    currentPeriodStart: { type: Date, required: true },
    currentPeriodEnd: { type: Date, required: true },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    canceledAt: { type: Date, default: null },
    trialEnd: { type: Date, default: null },
  },
  { timestamps: true },
);

subscriptionSchema.index({ customer: 1, status: 1 });
subscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });
subscriptionSchema.index({ status: 1, createdAt: -1 });
subscriptionSchema.index(
  { customer: 1, price: 1 },
  {
    unique: true,
    name: "uniq_active_customer_price",
    partialFilterExpression: { status: "active" },
  },
);

export const Subscription: Model<ISubscription> =
  (models.Subscription as Model<ISubscription>) ||
  model<ISubscription>("Subscription", subscriptionSchema);
