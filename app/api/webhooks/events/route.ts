import { handleError, ok, parsePage } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { WebhookEvent } from "@/models/WebhookEvent";
import { webhookDTO } from "@/lib/serialize";

export async function GET(request: Request) {
  try {
    await connectDB();
    const query = parsePage(new URL(request.url).searchParams);
    const filter: Record<string, unknown> = {};
    if (["received", "processed", "duplicate", "failed"].includes(query.status)) {
      filter.status = query.status;
    }
    const [docs, total] = await Promise.all([
      WebhookEvent.find(filter)
        .sort({ receivedAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      WebhookEvent.countDocuments(filter),
    ]);
    return ok({ events: docs.map((doc) => webhookDTO(doc)), total, page: query.page, limit: query.limit });
  } catch (error) {
    return handleError(error);
  }
}
