import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const server = await prisma.server.findUnique({
      where: { id },
    });

    if (!server || server.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
    }

    // Attempt to delete Stripe connected account
    if (server.stripeAccountId) {
      try {
        const Stripe = require("stripe");
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
        await stripe.accounts.del(server.stripeAccountId);
      } catch (stripeError) {
        console.error("Failed to delete Stripe account for server", id, stripeError);
        // We continue with the soft delete even if Stripe fails, or maybe just log it.
      }
    }

    // Soft Delete
    await prisma.server.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting server:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    
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

    const server = await prisma.server.findUnique({
      where: { id },
    });

    if (!server || server.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
    }

    const updatedServer = await prisma.server.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(updatedServer);
  } catch (error) {
    console.error("Error updating server:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
