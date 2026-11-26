import { Schema, model, models, type Model } from "mongoose";

export type UserRole = "owner" | "member";

export interface IUser {
  _id: Schema.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["owner", "member"], default: "member" },
  },
  { timestamps: true },
);

userSchema.index({ createdAt: -1 });

export const User: Model<IUser> =
  (models.User as Model<IUser>) || model<IUser>("User", userSchema);
