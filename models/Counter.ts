import { Schema, model, models, type Model } from "mongoose";

export interface ICounter {
  _id: string;
  seq: number;
}

const counterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, required: true, default: 0 },
});

export const Counter: Model<ICounter> =
  (models.Counter as Model<ICounter>) ||
  model<ICounter>("Counter", counterSchema);

export async function nextSequence(key: string): Promise<number> {
  const doc = await Counter.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  ).lean();
  return doc?.seq ?? 1;
}
