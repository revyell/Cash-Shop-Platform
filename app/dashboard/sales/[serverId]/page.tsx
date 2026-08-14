import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function SalesDashboard({ params }: { params: Promise<{ serverId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) redirect("/login");

  const { serverId } = await params;
  const server = await prisma.server.findUnique({
    where: { id: serverId },
  });

  if (!server || server.userId !== user.id) redirect("/dashboard");

  const transactions = await prisma.transaction.findMany({
    where: { serverId },
    orderBy: { createdAt: "desc" },
    take: 100, // Limit to recent 100 for MVP
  });

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6 lg:p-12 font-sans">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Sales History</h1>
            <p className="text-[#6b6b8a]">Recent transactions for {server.name}</p>
          </div>
          <Link href="/dashboard" className="px-4 py-2 bg-[#1e1e30] hover:bg-[#2a2a4a] text-white rounded-xl text-sm font-medium transition-colors">
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-[#111118] border border-[#1e1e30] rounded-2xl overflow-hidden">
          {transactions.length === 0 ? (
            <div className="p-12 text-center text-[#6b6b8a]">
              No transactions found yet.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-[#1e1e30]/50 text-[#6b6b8a] uppercase text-xs">
                <tr>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Player</th>
                  <th className="px-6 py-4 font-medium">Cash Amount</th>
                  <th className="px-6 py-4 font-medium">Fiat Paid</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e30]">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#1a1a24] transition-colors">
                    <td className="px-6 py-4 text-[#8b8bAA]">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-white font-medium">
                      {tx.playerName}
                    </td>
                    <td className="px-6 py-4 text-[#7c6af7] font-semibold">
                      {tx.amount} Cash
                    </td>
                    <td className="px-6 py-4 text-white">
                      {(tx.price / 100).toFixed(2)} {tx.currency.toUpperCase()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                        tx.status === "completed" 
                          ? "bg-green-500/10 text-green-400 border-green-500/20" 
                          : tx.status === "failed" 
                          ? "bg-red-500/10 text-red-400 border-red-500/20" 
                          : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                      }`}>
                        {tx.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
