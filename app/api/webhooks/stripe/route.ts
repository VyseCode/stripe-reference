import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, handleError } from "@/lib/api";
import { webhookSecret, verifyWebhookSignature } from "@/lib/webhooks";
import { WebhookEvent } from "@/models/WebhookEvent";
import { CheckoutSession } from "@/models/CheckoutSession";
import { Invoice } from "@/models/Invoice";
import { Subscription } from "@/models/Subscription";
import { webhookDTO } from "@/lib/serialize";

const eventSchema = z.object({
  id: z.string().trim().min(3).max(120),
  type: z.string().trim().min(3).max(120),
  data: z.record(z.string(), z.unknown()).optional().default({}),
});

const HANDLED_TYPES = new Set([
  "checkout.session.completed",
  "invoice.paid",
  "customer.subscription.updated",
]);

async function applyEffects(type: string, data: Record<string, unknown>) {
  const effects: string[] = [];
  const targetId = typeof data.id === "string" ? data.id : "";
  if (!targetId) return effects;

  if (type === "checkout.session.completed") {
    const session = await CheckoutSession.findOne({ pid: targetId }).lean();
    if (session && session.status === "open") {
      await CheckoutSession.updateOne(
        { _id: session._id },
        { $set: { status: "complete", completedAt: new Date() } },
      );
      effects.push("checkout_session_completed");
    }
  }

  if (type === "invoice.paid") {
    const invoice = await Invoice.findOne({ pid: targetId }).lean();
    if (invoice && invoice.status !== "paid") {
      await Invoice.updateOne(
        { _id: invoice._id },
        { $set: { status: "paid", paidAt: new Date() } },
      );
      effects.push("invoice_marked_paid");
    }
  }

  if (type === "customer.subscription.updated" && data.cancel_at_period_end === true) {
    const subscription = await Subscription.findOne({ pid: targetId }).lean();
    if (subscription && !subscription.cancelAtPeriodEnd) {
      await Subscription.updateOne(
        { _id: subscription._id },
        { $set: { cancelAtPeriodEnd: true } },
      );
      effects.push("subscription_cancel_at_period_end");
    }
  }

  return effects;
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    if (!verifyWebhookSignature(rawBody, request.headers.get("x-ledgerline-signature"), webhookSecret())) {
      return fail("Invalid webhook signature", 400);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return fail("Invalid JSON body", 400);
    }
    const event = eventSchema.parse(parsed);
    await connectDB();

    const existing = await WebhookEvent.findOne({ eventId: event.id }).lean();
    if (existing) {
      await WebhookEvent.updateOne(
        { _id: existing._id },
        { $inc: { deliveries: 1 } },
      );
      const updated = await WebhookEvent.findById(existing._id).lean();
      return NextResponse.json({
        received: true,
        duplicate: true,
        event: webhookDTO(updated!),
        effects: [],
      });
    }

    const stored = await WebhookEvent.create({
      eventId: event.id,
      type: event.type,
      payload: event.data,
      signature: request.headers.get("x-ledgerline-signature") ?? "",
      status: "received",
      deliveries: 1,
      error: "",
      receivedAt: new Date(),
      processedAt: null,
    });

    const effects = HANDLED_TYPES.has(event.type)
      ? await applyEffects(event.type, event.data)
      : [];

    const processed = await WebhookEvent.findByIdAndUpdate(
      stored._id,
      { $set: { status: "processed", processedAt: new Date() } },
      { returnDocument: "after" },
    ).lean();

    return NextResponse.json({
      received: true,
      duplicate: false,
      event: webhookDTO(processed!),
      effects,
    });
  } catch (error) {
    return handleError(error);
  }
}
