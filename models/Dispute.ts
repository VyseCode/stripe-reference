import { Schema, model, models, type Model, type Types } from "mongoose";

export type DisputeStatus = "open" | "won" | "lost" | "closed";

export interface IDispute {
  _id: Types.ObjectId;
  pid: string;
  chargeRef: string;
  amountMinor: number;
  currency: string;
  reason: string;
  status: DisputeStatus;
  evidence: string;
  createdAt: Date;
  updatedAt: Date;
}

const disputeSchema = new Schema<IDispute>(
  {
    pid: { type: String, required: true, unique: true },
    chargeRef: { type: String, required: true, index: true },
    amountMinor: { type: Number, required: true, min: 1 },
    currency: { type: String, required: true, lowercase: true, default: "usd" },
    reason: {
      type: String,
      enum: ["product_not_received", "duplicate", "unrecognized", "fraudulent"],
      default: "product_not_received",
    },
    status: {
      type: String,
      enum: ["open", "won", "lost", "closed"],
      default: "open",
    },
    evidence: { type: String, default: "", maxlength: 2000 },
  },
  { timestamps: true },
);

disputeSchema.index({ status: 1, createdAt: -1 });

export const Dispute: Model<IDispute> =
  (models.Dispute as Model<IDispute>) ||
  model<IDispute>("Dispute", disputeSchema);
