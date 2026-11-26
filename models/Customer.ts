import { Schema, model, models, type Model, type Types } from "mongoose";

export interface ICustomer {
  _id: Types.ObjectId;
  pid: string;
  name: string;
  email: string;
  description: string;
  currency: string;
  balanceMinor: number;
  metadata: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>(
  {
    pid: { type: String, required: true, unique: true, uppercase: false },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Enter a valid email"],
    },
    description: { type: String, default: "", maxlength: 1000 },
    currency: { type: String, default: "usd", lowercase: true },
    balanceMinor: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: true },
);

customerSchema.index({ email: 1 });
customerSchema.index({ name: 1 });
customerSchema.index({ createdAt: -1 });

export const Customer: Model<ICustomer> =
  (models.Customer as Model<ICustomer>) ||
  model<ICustomer>("Customer", customerSchema);
