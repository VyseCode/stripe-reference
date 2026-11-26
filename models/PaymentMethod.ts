import { Schema, model, models, type Model, type Types } from "mongoose";

export interface IPaymentMethod {
  _id: Types.ObjectId;
  pid: string;
  token: string;
  customer: Types.ObjectId;
  type: "card";
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const paymentMethodSchema = new Schema<IPaymentMethod>(
  {
    pid: { type: String, required: true, unique: true },
    token: { type: String, required: true, unique: true },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    type: { type: String, enum: ["card"], default: "card" },
    brand: { type: String, required: true },
    last4: { type: String, required: true, minlength: 4, maxlength: 4 },
    expMonth: { type: Number, required: true, min: 1, max: 12 },
    expYear: { type: Number, required: true, min: 2024, max: 2100 },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

paymentMethodSchema.index({ customer: 1, token: 1 }, { unique: true });
paymentMethodSchema.index({ customer: 1, isDefault: 1 });

export const PaymentMethod: Model<IPaymentMethod> =
  (models.PaymentMethod as Model<IPaymentMethod>) ||
  model<IPaymentMethod>("PaymentMethod", paymentMethodSchema);
