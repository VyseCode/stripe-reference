import { createHash, randomBytes } from "node:crypto";
import { ApiKey, type ApiKeyScope } from "@/models/ApiKey";
import { connectDB } from "@/lib/db";

const SCOPE_RANK: Record<ApiKeyScope, number> = {
  read: 1,
  write: 2,
  admin: 3,
};

export type GeneratedKey = {
  token: string;
  prefix: string;
  last4: string;
  masked: string;
  hash: string;
};

export function hashKey(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateApiKey(scope: ApiKeyScope): GeneratedKey {
  const prefix = scope === "admin" ? "ll_admin" : scope === "write" ? "ll_write" : "ll_read";
  const random = randomBytes(12).toString("hex");
  const token = `${prefix}_${random}`;
  const last4 = token.slice(-4);
  return {
    token,
    prefix,
    last4,
    masked: `${prefix}_••••${last4}`,
    hash: hashKey(token),
  };
}

export type KeyAuth =
  | { status: "none" }
  | { status: "invalid" }
  | { status: "insufficient"; scope: ApiKeyScope }
  | { status: "ok"; scope: ApiKeyScope; name: string; id: string };

export async function authorizeApiKey(
  request: Request,
  required: ApiKeyScope,
): Promise<KeyAuth> {
  const header = request.headers.get("authorization");
  if (!header) return { status: "none" };

  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  if (!match) return { status: "invalid" };

  const token = match[1];
  await connectDB();
  const key = await ApiKey.findOne({ hash: hashKey(token), revokedAt: null }).lean();
  if (!key) return { status: "invalid" };

  if (SCOPE_RANK[key.scope] < SCOPE_RANK[required]) {
    return { status: "insufficient", scope: key.scope };
  }

  await ApiKey.updateOne({ _id: key._id }, { $set: { lastUsedAt: new Date() } });
  return { status: "ok", scope: key.scope, name: key.name, id: key._id.toString() };
}
