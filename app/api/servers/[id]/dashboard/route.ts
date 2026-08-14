import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id } = await params;
  const server = await prisma.server.findFirst({
    where: { id, userId: user.id },
  });

  if (!server || !server.stripeAccountId) {
    return NextResponse.json({ error: "Server not found" }, { status: 404 });
  }

  try {
    const loginLink = await stripe.accounts.createLoginLink(server.stripeAccountId);
    return NextResponse.json({ url: loginLink.url });
  } catch (error) {
    console.error("Error creating login link:", error);
    return NextResponse.json({ error: "Failed to create Stripe dashboard link" }, { status: 500 });
  }
}
