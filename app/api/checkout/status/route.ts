import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const serverToken = searchParams.get("serverToken");

    if (!sessionId || !serverToken) {
      return NextResponse.json({ error: "Missing sessionId or serverToken" }, { status: 400 });
    }

    const server = await prisma.server.findUnique({
      where: { serverToken },
    });

    if (!server || !server.stripeAccountId) {
      return NextResponse.json({ error: "Invalid server token or Stripe not connected" }, { status: 403 });
    }

    if (server.banned) {
      return NextResponse.json({ error: "This server has been banned." }, { status: 403 });
    }

    // Retrieve the checkout session from the connected account
    const session = await stripe.checkout.sessions.retrieve(sessionId, undefined, {
      stripeAccount: server.stripeAccountId,
    });

    if (session.payment_status === "paid") {
      await prisma.transaction.update({
        where: { stripeSessionId: sessionId },
        data: { status: "completed" },
      });
    }

    return NextResponse.json({
      payment_status: session.payment_status,
      status: session.status,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    console.error(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
