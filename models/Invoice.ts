import { Schema, model, models, type Model, type Types } from "mongoose";

export type InvoiceStatus =
  | "draft"
  | "open"
  | "paid"
  | "void"
  | "uncollectible";

export interface IInvoiceLine {
  _id: Types.ObjectId;
  description: string;
  quantity: number;
  unitAmountMinor: number;
  amountMinor: number;
}

export interface IInvoice {
  _id: Types.ObjectId;
  pid: string;
  number: string;
  customer: Types.ObjectId;
  subscription: Types.ObjectId | null;
  status: InvoiceStatus;
  currency: string;
  lines: IInvoiceLine[];
  subtotalMinor: number;
  taxMinor: number;
  amountMinor: number;
  periodStart: Date | null;
  periodEnd: Date | null;
  dueDate: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceLineSchema = new Schema<IInvoiceLine>(
  {
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    unitAmountMinor: { type: Number, required: true, min: 0 },
    amountMinor: { type: Number, required: true, min: 0 },
  },
  { _id: true },
);

const invoiceSchema = new Schema<IInvoice>(
  {
    pid: { type: String, required: true, unique: true },
    number: { type: String, required: true, unique: true },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    subscription: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      default: null,
    },
    status: {
      type: String,
      enum: ["draft", "open", "paid", "void", "uncollectible"],
      default: "draft",
    },
    currency: { type: String, required: true, lowercase: true, default: "usd" },
    lines: { type: [invoiceLineSchema], default: [] },
    subtotalMinor: { type: Number, required: true, min: 0, default: 0 },
    taxMinor: { type: Number, required: true, min: 0, default: 0 },
    amountMinor: { type: Number, required: true, min: 0, default: 0 },
    periodStart: { type: Date, default: null },
    periodEnd: { type: Date, default: null },
    dueDate: { type: Date, default: null },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true },
);

invoiceSchema.index({ customer: 1, createdAt: -1 });
invoiceSchema.index({ status: 1, dueDate: -1 });
invoiceSchema.index({ subscription: 1, createdAt: -1 });

export const Invoice: Model<IInvoice> =
  (models.Invoice as Model<IInvoice>) ||
  model<IInvoice>("Invoice", invoiceSchema);
