import { z } from "zod";
import { getSession } from "@/lib/auth";
import { fail, handleError, ok, readJson } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { generateApiKey } from "@/lib/keys";
import { ApiKey } from "@/models/ApiKey";
import { apiKeyDTO } from "@/lib/serialize";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return fail("You must be signed in", 401);
    await connectDB();

    const docs = await ApiKey.find().sort({ createdAt: -1 }).limit(100).lean();
    return ok({ apiKeys: docs.map((doc) => apiKeyDTO(doc)) });
  } catch (error) {
    return handleError(error);
  }
}

const createSchema = z.object({
  name: z.string().trim().min(2, "Give the key a name").max(80),
  scope: z.enum(["read", "write", "admin"]),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return fail("You must be signed in", 401);

    const body = createSchema.parse(await readJson(request));
    await connectDB();
    if (!TypesObjectId(session.userId)) return fail("Invalid session", 401);

    const generated = generateApiKey(body.scope);
    const key = await ApiKey.create({
      name: body.name,
      prefix: generated.prefix,
      last4: generated.last4,
      masked: generated.masked,
      hash: generated.hash,
      scope: body.scope,
      createdBy: session.userId,
    });

    return ok(
      {
        apiKey: apiKeyDTO(key),
        token: generated.token,
        warning: "Copy this value now. The full token is not stored and cannot be shown again.",
      },
      201,
    );
  } catch (error) {
    return handleError(error);
  }
}

function TypesObjectId(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value);
}
