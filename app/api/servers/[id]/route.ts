import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import Stripe from "stripe";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { id } = params;

    const server = await prisma.server.findUnique({ where: { id } });

    if (!server || server.userId !== user.id) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
    }

    // Attempt to delete Stripe connected account
    if (server.stripeAccountId) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
        await stripe.accounts.del(server.stripeAccountId);
      } catch (stripeError) {
        console.error("Failed to delete Stripe account for server", id, stripeError);
        // Continue with soft delete even if Stripe fails
      }
    }

    // Soft Delete
    await prisma.server.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting server:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fix: look up user by email to get real DB id
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { id } = params;

    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.priceUSD !== undefined) updateData.priceUSD = Number(body.priceUSD);
    if (body.priceBRL !== undefined) updateData.priceBRL = Number(body.priceBRL);
    if (body.priceEUR !== undefined) updateData.priceEUR = Number(body.priceEUR);
    if (body.acceptedCurrencies !== undefined) updateData.acceptedCurrencies = body.acceptedCurrencies;
    if (body.defaultCurrency !== undefined) updateData.defaultCurrency = body.defaultCurrency;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const server = await prisma.server.findUnique({ where: { id } });

    // Fix: compare against user.id from DB (not session.user.id which may be undefined)
    if (!server || server.userId !== user.id) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
    }

    const updatedServer = await prisma.server.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(updatedServer);
  } catch (error: any) {
    console.error("Error updating server:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
