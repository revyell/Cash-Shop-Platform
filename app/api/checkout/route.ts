import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const FEE_PERCENT = parseFloat(process.env.STRIPE_FEE_PERCENT || "0.05");

// This is the endpoint the Minecraft mod calls
export async function POST(req: NextRequest) {
  try {
    const { serverToken, currency, amount, quantity, productName, playerName } = await req.json();

    if (!serverToken || !currency || !amount || !quantity || !productName || !playerName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const server = await prisma.server.findUnique({
      where: { serverToken },
    });

    if (!server || !server.stripeAccountId) {
      return NextResponse.json({ error: "Invalid server token or Stripe not connected" }, { status: 403 });
    }

    if (server.banned) {
      return NextResponse.json({ error: "This server has been banned from using Revyell's Cash System." }, { status: 403 });
    }

    // Capture IP from request
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "Unknown IP";

    await prisma.server.update({
      where: { id: server.id },
      data: { lastIp: ip }
    });

    // Amount is in cents, so we multiply by quantity to get the total
    const totalAmount = amount * quantity;
    const applicationFeeAmount = Math.round(totalAmount * FEE_PERCENT);

    // Helper to create session
    const createSession = () => stripe.checkout.sessions.create(
      {
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: currency,
              product_data: {
                name: productName,
              },
              unit_amount: amount,
            },
            quantity: quantity,
          },
        ],
        mode: "payment",
        success_url: `${process.env.NEXTAUTH_URL}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXTAUTH_URL}/checkout/cancel`,
        payment_intent_data: {
          application_fee_amount: applicationFeeAmount,
        },
      },
      {
        stripeAccount: server.stripeAccountId!,
      }
    );

    let session;
    try {
      session = await createSession();
    } catch (err: any) {
      if (err.message && err.message.includes("business name")) {
        // Auto-fix the missing business name for test accounts
        await stripe.accounts.update(server.stripeAccountId!, {
          business_profile: { name: server.name || "Minecraft Server" }
        });
        session = await createSession();
      } else {
        throw err;
      }
    }

    await prisma.transaction.create({
      data: {
        serverId: server.id,
        playerName,
        amount: quantity,
        price: totalAmount,
        currency,
        stripeSessionId: session.id,
        status: "pending"
      }
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    console.error(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
