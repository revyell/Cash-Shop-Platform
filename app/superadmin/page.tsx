"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Transaction {
  id: string;
  price: number;
  status: string;
}

interface Server {
  id: string;
  name: string;
  banned: boolean;
  createdAt: string;
  deletedAt: string | null;
  stripeAccountId: string | null;
  transactions: Transaction[];
  user: {
    email: string;
  };
}

export default function SuperadminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      fetch("/api/superadmin/servers")
        .then((res) => {
          if (!res.ok) throw new Error("Forbidden");
          return res.json();
        })
        .then((data) => {
          setServers(data);
          setLoading(false);
        })
        .catch(() => {
          router.push("/dashboard");
        });
    }
  }, [status, router]);

  const toggleBan = async (serverId: string, currentBanStatus: boolean) => {
    if (!window.confirm(`Are you sure you want to ${currentBanStatus ? "UNBAN" : "BAN"} this server?`)) return;
    
    try {
      const res = await fetch(`/api/superadmin/servers/${serverId}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ban: !currentBanStatus }),
      });
      if (res.ok) {
        setServers((prev) => 
          prev.map((s) => (s.id === serverId ? { ...s, banned: !currentBanStatus } : s))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#ff3366] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6 lg:p-12 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#ff3366] mb-2 flex items-center gap-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Superadmin Global Dashboard
            </h1>
            <p className="text-[#6b6b8a]">Manage all registered servers across the platform</p>
          </div>
          <Link href="/dashboard" className="px-4 py-2 bg-[#1e1e30] hover:bg-[#2a2a4a] text-white rounded-xl text-sm font-medium transition-colors">
            Exit to Normal Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-[#111118] border border-[#1e1e30] rounded-2xl p-6">
            <h3 className="text-[#6b6b8a] text-sm font-medium mb-1">Total Servers</h3>
            <p className="text-3xl font-bold text-white">{servers.length}</p>
          </div>
          <div className="bg-[#111118] border border-[#1e1e30] rounded-2xl p-6">
            <h3 className="text-[#6b6b8a] text-sm font-medium mb-1">Stripe Connected</h3>
            <p className="text-3xl font-bold text-green-400">
              {servers.filter(s => s.stripeAccountId && !s.deletedAt).length}
            </p>
          </div>
          <div className="bg-[#111118] border border-[#1e1e30] border-red-500/20 rounded-2xl p-6">
            <h3 className="text-[#6b6b8a] text-sm font-medium mb-1">Banned Servers</h3>
            <p className="text-3xl font-bold text-red-500">
              {servers.filter(s => s.banned && !s.deletedAt).length}
            </p>
          </div>
          <div className="bg-[#111118] border border-[#1e1e30] border-gray-500/20 rounded-2xl p-6">
            <h3 className="text-[#6b6b8a] text-sm font-medium mb-1">Deleted Servers</h3>
            <p className="text-3xl font-bold text-gray-400">
              {servers.filter(s => s.deletedAt).length}
            </p>
          </div>
        </div>

        <div className="bg-[#111118] border border-[#1e1e30] rounded-2xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1e1e30]/50 text-[#6b6b8a] uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-medium">Server Name</th>
                <th className="px-6 py-4 font-medium">Owner Email</th>
                <th className="px-6 py-4 font-medium">Stripe Status</th>
                <th className="px-6 py-4 font-medium">Total Volume (Gross)</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e30]">
              {servers.map((server) => {
                const totalVolume = server.transactions
                  .filter(t => t.status === "completed")
                  .reduce((acc, t) => acc + t.price, 0);

                return (
                  <tr key={server.id} className={`transition-colors ${server.deletedAt ? "bg-[#111118] opacity-60" : "hover:bg-[#1a1a24]"}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <p className={`font-medium ${server.deletedAt ? "text-gray-400 line-through" : "text-white"}`}>{server.name}</p>
                        {server.deletedAt && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-500/20 text-gray-400 border border-gray-500/30">DELETED</span>
                        )}
                      </div>
                      <p className="text-[#6b6b8a] text-xs mt-1">Since {new Date(server.createdAt).toLocaleDateString()}</p>
                      {server.lastIp && <p className="text-blue-400 text-xs font-mono mt-1">IP: {server.lastIp}</p>}
                    </td>
                    <td className="px-6 py-4 text-[#8b8bAA]">
                      {server.user.email}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                        server.deletedAt
                          ? "bg-gray-500/10 text-gray-400 border-gray-500/20"
                          : server.stripeAccountId 
                            ? "bg-green-500/10 text-green-400 border-green-500/20" 
                            : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                      }`}>
                        {server.deletedAt ? "Account Purged" : (server.stripeAccountId ? "Connected" : "No Stripe")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white font-medium">
                      {(totalVolume / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {server.deletedAt ? (
                        <div className="text-xs text-gray-500">Deleted on<br/>{new Date(server.deletedAt).toLocaleDateString()}</div>
                      ) : (
                        <button
                          onClick={() => toggleBan(server.id, server.banned)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
                            server.banned 
                              ? "bg-green-500/10 hover:bg-green-500/20 text-green-500 border-green-500/20" 
                              : "bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/20"
                          }`}
                        >
                          {server.banned ? "Unban Server" : "Ban Server"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
