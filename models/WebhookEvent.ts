import { Schema, model, models, type Model } from "mongoose";

export type WebhookStatus = "received" | "processed" | "duplicate" | "failed";

export interface IWebhookEvent {
  _id: Schema.Types.ObjectId;
  eventId: string;
  type: string;
  payload: Record<string, unknown>;
  signature: string;
  status: WebhookStatus;
  deliveries: number;
  error: string;
  receivedAt: Date;
  processedAt: Date | null;
}

const webhookEventSchema = new Schema<IWebhookEvent>(
  {
    eventId: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    signature: { type: String, required: true, default: "" },
    status: {
      type: String,
      enum: ["received", "processed", "duplicate", "failed"],
      default: "received",
    },
    deliveries: { type: Number, default: 1, min: 1 },
    error: { type: String, default: "" },
    receivedAt: { type: Date, default: Date.now },
    processedAt: { type: Date, default: null },
  },
  { timestamps: false, versionKey: false },
);

webhookEventSchema.index({ type: 1, receivedAt: -1 });
webhookEventSchema.index({ receivedAt: -1 });
webhookEventSchema.index({ status: 1, receivedAt: -1 });

export const WebhookEvent: Model<IWebhookEvent> =
  (models.WebhookEvent as Model<IWebhookEvent>) ||
  model<IWebhookEvent>("WebhookEvent", webhookEventSchema);
