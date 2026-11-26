import { Schema, model, models, type Model, type Types } from "mongoose";

export type ApiKeyScope = "read" | "write" | "admin";

export interface IApiKey {
  _id: Types.ObjectId;
  name: string;
  prefix: string;
  last4: string;
  masked: string;
  hash: string;
  scope: ApiKeyScope;
  createdBy: Types.ObjectId;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const apiKeySchema = new Schema<IApiKey>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    prefix: { type: String, required: true },
    last4: { type: String, required: true, minlength: 4, maxlength: 4 },
    masked: { type: String, required: true },
    hash: { type: String, required: true, unique: true },
    scope: {
      type: String,
      enum: ["read", "write", "admin"],
      required: true,
      default: "read",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    revokedAt: { type: Date, default: null },
    lastUsedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

apiKeySchema.index({ scope: 1, revokedAt: 1 });
apiKeySchema.index({ createdAt: -1 });

export const ApiKey: Model<IApiKey> =
  (models.ApiKey as Model<IApiKey>) ||
  model<IApiKey>("ApiKey", apiKeySchema);
