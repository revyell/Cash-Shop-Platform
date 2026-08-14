import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { serverToken } = await req.json();

    if (!serverToken) {
      return NextResponse.json({ error: "Missing server token" }, { status: 400 });
    }

    const server = await prisma.server.findUnique({
      where: { serverToken },
    });

    if (!server) {
      return NextResponse.json({ error: "Invalid server token" }, { status: 403 });
    }

    // Capture IP from request
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || req.ip || "127.0.0.1";

    await prisma.server.update({
      where: { id: server.id },
      data: { 
        lastIp: ip,
        lastHeartbeat: new Date()
      }
    });

    return NextResponse.json({ 
      success: true,
      priceBRL: server.priceBRL,
      priceUSD: server.priceUSD,
      priceEUR: server.priceEUR,
      acceptedCurrencies: server.acceptedCurrencies,
      defaultCurrency: server.defaultCurrency
    });
  } catch (e: unknown) {
    console.error("Heartbeat error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
