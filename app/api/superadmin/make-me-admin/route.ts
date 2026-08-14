import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.user.update({
    where: { email: session.user.email },
    data: { role: "SUPERADMIN" },
  });

  return NextResponse.redirect(new URL("/superadmin", process.env.NEXTAUTH_URL || "http://localhost:3000"));
}
