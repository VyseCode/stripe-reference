import { authorizeApiKey } from "@/lib/keys";
import { fail, handleError, ok } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { Invoice } from "@/models/Invoice";
import { Subscription } from "@/models/Subscription";
import { WebhookEvent } from "@/models/WebhookEvent";

export async function GET(request: Request) {
  try {
    const auth = await authorizeApiKey(request, "admin");
    if (auth.status === "none" || auth.status === "invalid") {
      return fail("A valid API key is required", 401);
    }
    if (auth.status === "insufficient") {
      return fail(`This ${auth.scope}-scope key cannot access admin metrics`, 403);
    }

    await connectDB();
    const [customers, activeSubscriptions, paidInvoices, webhookEvents] =
      await Promise.all([
        Customer.countDocuments({}),
        Subscription.countDocuments({ status: { $in: ["active", "trialing"] } }),
        Invoice.countDocuments({ status: "paid" }),
        WebhookEvent.countDocuments({}),
      ]);

    return ok({
      metrics: {
        customers,
        activeSubscriptions,
        paidInvoices,
        webhookEvents,
        generatedAt: new Date().toISOString(),
      },
      key: { name: auth.name, scope: auth.scope, id: auth.id },
    });
  } catch (error) {
    return handleError(error);
  }
}
