import { Schema, model, models, type Model, type Types } from "mongoose";

export interface IProduct {
  _id: Types.ObjectId;
  pid: string;
  name: string;
  description: string;
  active: boolean;
  metadata: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    pid: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: "", maxlength: 1000 },
    active: { type: Boolean, default: true },
    metadata: { type: Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: true },
);

productSchema.index({ active: 1, createdAt: -1 });
productSchema.index({ name: 1 });

export const Product: Model<IProduct> =
  (models.Product as Model<IProduct>) ||
  model<IProduct>("Product", productSchema);
