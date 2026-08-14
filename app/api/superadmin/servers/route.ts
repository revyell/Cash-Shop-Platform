import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || user.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const servers = await prisma.server.findMany({
    include: {
      user: { select: { email: true } },
      transactions: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(servers);
}
