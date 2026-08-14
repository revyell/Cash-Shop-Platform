import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const servers = await prisma.server.findMany({
    where: { 
      userId: user.id,
      deletedAt: null
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(servers);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let serverName = body.name || "Minecraft Server";
  let priceBRL = body.priceBRL !== undefined ? Number(body.priceBRL) : 1;
  let priceUSD = body.priceUSD !== undefined ? Number(body.priceUSD) : 1;
  let priceEUR = body.priceEUR !== undefined ? Number(body.priceEUR) : 1;
  let acceptedCurrencies = body.acceptedCurrencies || "brl,usd,eur";
  let defaultCurrency = body.defaultCurrency || "brl";

  try {
    const account = await stripe.accounts.create({
      type: "express",
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      business_type: "individual",
    });

    const server = await prisma.server.create({
      data: {
        name: serverName,
        stripeAccountId: account.id,
        priceBRL: Number(priceBRL),
        priceUSD: Number(priceUSD),
        priceEUR: Number(priceEUR),
        acceptedCurrencies,
        defaultCurrency,
        userId: user.id,
      },
    });

    return NextResponse.json(server, { status: 201 });
  } catch (e: any) {
    console.error("Error creating server:", e);
    return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
  }
}
