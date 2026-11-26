import { Schema, model, models, type Model, type Types } from "mongoose";

export type PriceInterval = "one_time" | "month" | "year";

export interface IPrice {
  _id: Types.ObjectId;
  pid: string;
  product: Types.ObjectId;
  unitAmountMinor: number;
  currency: string;
  interval: PriceInterval;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const priceSchema = new Schema<IPrice>(
  {
    pid: { type: String, required: true, unique: true },
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    unitAmountMinor: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, lowercase: true, default: "usd" },
    interval: {
      type: String,
      enum: ["one_time", "month", "year"],
      required: true,
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

priceSchema.index({ product: 1, active: 1 });
priceSchema.index({ unitAmountMinor: 1 });
priceSchema.index({ createdAt: -1 });

export const Price: Model<IPrice> =
  (models.Price as Model<IPrice>) || model<IPrice>("Price", priceSchema);
