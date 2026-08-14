"use client";
import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface Server {
  id: string;
  name: string;
  serverToken: string;
  stripeAccountId: string | null;
  onboardingDone: boolean;
  createdAt: string;
  lastIp: string | null;
  lastHeartbeat: string | null;
  priceBRL: number; // in cents
  priceUSD: number; // in cents
  priceEUR: number; // in cents
  acceptedCurrencies: string;
  defaultCurrency: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [servers, setServers] = useState<Server[]>([]);
  const [newServerName, setNewServerName] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [expandedServerId, setExpandedServerId] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [editingServerId, setEditingServerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [revealedTokens, setRevealedTokens] = useState<Record<string, boolean>>({});
  
  // Pricing Form State (Values are floats e.g. 1.00)
  const [pricingForm, setPricingForm] = useState({
    usd: false,
    brl: false,
    eur: false,
    priceUSD: "1.00",
    priceBRL: "1.00",
    priceEUR: "1.00",
    defaultCur: "usd"
  });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (session) fetchServers();
  }, [session]);

  const fetchServers = async () => {
    const res = await fetch("/api/servers");
    if (res.ok) setServers(await res.json());
  };

  const createServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServerName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/servers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newServerName }),
    });
    if (res.ok) {
      setNewServerName("");
      fetchServers();
    }
    setCreating(false);
  };

  const startOnboarding = async (serverId: string) => {
    const res = await fetch(`/api/servers/${serverId}/onboarding`, { method: "POST" });
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    }
  };

  const openStripeDashboard = async (serverId: string) => {
    const res = await fetch(`/api/servers/${serverId}/dashboard`, { method: "POST" });
    if (res.ok) {
      const { url } = await res.json();
      window.open(url, '_blank');
    } else {
      alert("Failed to generate payouts dashboard link. Make sure your account is fully set up.");
    }
  };

  const deleteServer = async (serverId: string) => {
    if (confirmingDelete !== serverId) {
      setConfirmingDelete(serverId);
      return;
    }
    try {
      const res = await fetch(`/api/servers/${serverId}`, { method: "DELETE" });
      if (res.ok) {
        setConfirmingDelete(null);
        fetchServers();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to delete: ${err.error || res.status}`);
        setConfirmingDelete(null);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
      setConfirmingDelete(null);
    }
  };

  const saveServerName = async (serverId: string) => {
    if (!editingName.trim()) return;
    setSavingName(true);
    const res = await fetch(`/api/servers/${serverId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingName }),
    });
    if (res.ok) {
      setEditingServerId(null);
      fetchServers();
    }
    setSavingName(false);
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleExpandServer = (server: Server) => {
    if (expandedServerId === server.id) {
      setExpandedServerId(null);
      return;
    }
    
    // Load server values into the form (Convert cents to floats)
    const accepted = server.acceptedCurrencies ? server.acceptedCurrencies.split(",") : ["brl","usd","eur"];
    setPricingForm({
      usd: accepted.includes("usd"),
      brl: accepted.includes("brl"),
      eur: accepted.includes("eur"),
      priceUSD: (server.priceUSD / 100).toFixed(2),
      priceBRL: (server.priceBRL / 100).toFixed(2),
      priceEUR: (server.priceEUR / 100).toFixed(2),
      defaultCur: server.defaultCurrency || "brl"
    });
    setExpandedServerId(server.id);
  };

  const handleSyncPricing = async (server: Server) => {
    try {
      const accepted = [];
      if (pricingForm.usd) accepted.push("usd");
      if (pricingForm.brl) accepted.push("brl");
      if (pricingForm.eur) accepted.push("eur");
      if (accepted.length === 0) return alert("Select at least one currency.");
      
      if (!accepted.includes(pricingForm.defaultCur)) {
        return alert("Default currency must be one of the accepted currencies.");
      }
      
      const centsUSD = Math.round(parseFloat(pricingForm.priceUSD) * 100);
      const centsBRL = Math.round(parseFloat(pricingForm.priceBRL) * 100);
      const centsEUR = Math.round(parseFloat(pricingForm.priceEUR) * 100);

      // Save to DB first before syncing to Mod
      const res = await fetch(`/api/servers/${server.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceUSD: centsUSD,
          priceBRL: centsBRL,
          priceEUR: centsEUR,
          acceptedCurrencies: accepted.join(","),
          defaultCurrency: pricingForm.defaultCur
        }),
      });
      
      if (res.ok) {
        fetchServers(); // Refresh list to get new DB values
        const url = `/sync-pricing?currencies=${accepted.join(",")}&default=${pricingForm.defaultCur}&usd=${centsUSD}&brl=${centsBRL}&eur=${centsEUR}`;
        router.push(url);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Failed to update pricing: ${errData.error || res.statusText || res.status}`);
      }
    } catch (e: any) {
      alert(`JavaScript Error: ${e.message}`);
    }
  };

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#7c6af7] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const onboardingSuccess = searchParams.get("onboarding") === "success";

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <nav className="border-b border-[#1e1e30] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1a1a2e] border border-[#2a2a4a] flex items-center justify-center">
              <svg className="w-4 h-4 text-[#7c6af7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <span className="text-white font-semibold text-sm">Revyell&apos;s Cash</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[#6b6b8a] text-sm">{session?.user?.email}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-[#6b6b8a] hover:text-white text-sm transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {onboardingSuccess && (
          <div className="mb-8 bg-green-500/10 border border-green-500/20 rounded-xl px-5 py-4 text-green-400 text-sm flex items-center gap-3">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Payment account connected successfully! You&apos;re ready to receive payments.
          </div>
        )}

        <div className="mb-10">
          <h1 className="text-2xl font-semibold text-white">Your Servers</h1>
          <p className="text-[#6b6b8a] text-sm mt-1">
            Manage your Minecraft servers and setup your payments system.
          </p>
        </div>

        <div className="bg-[#111118] border border-[#1e1e30] rounded-2xl p-6 mb-8">
          <h2 className="text-white font-medium text-sm mb-4">Add a New Server</h2>
          <form onSubmit={createServer} className="flex gap-3">
            <input
              type="text"
              value={newServerName}
              onChange={(e) => setNewServerName(e.target.value)}
              className="flex-1 bg-[#0a0a0f] border border-[#2a2a4a] rounded-xl px-4 py-2.5 text-white text-sm placeholder-[#3a3a5a] focus:outline-none focus:border-[#7c6af7] transition-colors"
              placeholder="My Minecraft Server"
            />
            <button
              type="submit"
              disabled={creating}
              className="bg-[#7c6af7] hover:bg-[#6a58e0] disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors shrink-0"
            >
              {creating ? "Creating..." : "Add Server"}
            </button>
          </form>
        </div>

        {servers.length === 0 ? (
          <div className="text-center py-20 text-[#6b6b8a]">
            <div className="w-16 h-16 rounded-2xl bg-[#111118] border border-[#1e1e30] flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#3a3a5a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-sm">No servers yet. Add your first one above.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {servers.map((server) => {
              // 90s window: 30s heartbeat interval + generous latency buffer
              const isOnline = server.lastHeartbeat && new Date(server.lastHeartbeat).getTime() > Date.now() - 90000;
              return (
              <div key={server.id} className="bg-[#111118] border border-[#1e1e30] rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      {editingServerId === server.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveServerName(server.id)}
                            disabled={savingName}
                            className="bg-[#0a0a0f] border border-[#2a2a4a] rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:border-[#7c6af7]"
                            autoFocus
                          />
                          <button onClick={() => saveServerName(server.id)} disabled={savingName} className="p-1.5 text-green-400 hover:bg-green-400/10 rounded-lg transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          </button>
                          <button onClick={() => setEditingServerId(null)} disabled={savingName} className="p-1.5 text-[#6b6b8a] hover:text-white hover:bg-[#2a2a4a] rounded-lg transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ) : (
                        <>
                          <h3 className="text-white font-medium flex items-center gap-2 group">
                            {server.name}
                            <button
                              onClick={() => {
                                setEditingServerId(server.id);
                                setEditingName(server.name);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-[#6b6b8a] hover:text-white transition-all rounded hover:bg-[#2a2a4a]"
                              title="Rename server"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          </h3>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            server.stripeAccountId
                              ? "bg-green-500/10 text-green-400 border border-green-500/20"
                              : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                          }`}>
                            {server.stripeAccountId ? "Payments Active" : "Awaiting Setup"}
                          </span>

                          {/* Online Status Badge */}
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 ${
                            isOnline
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-[#2a2a4a] text-[#8b8b9a] border border-[#3a3a5a]"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-400 animate-pulse" : "bg-[#8b8b9a]"}`}></span>
                            {isOnline ? "Online" : "Offline"}
                          </span>
                        </>
                      )}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-xs text-[#6b6b8a] mb-6 font-mono">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Linked on: {new Date(server.createdAt).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1.5 group/token cursor-pointer" onClick={() => copyToken(server.serverToken)}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      Token: {revealedTokens[server.id] ? server.serverToken : `${server.serverToken.substring(0, 8)}...`}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRevealedTokens(prev => ({ ...prev, [server.id]: !prev[server.id] }));
                        }}
                        className="opacity-0 group-hover/token:opacity-100 p-0.5 text-[#6b6b8a] hover:text-white transition-all rounded hover:bg-[#2a2a4a] ml-1"
                        title={revealedTokens[server.id] ? "Hide token" : "Reveal token"}
                      >
                        {revealedTokens[server.id] ? (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        )}
                      </button>
                      {copiedToken === server.serverToken && (
                        <span className="text-green-400 text-[10px] uppercase font-bold ml-1">Copied!</span>
                      )}
                    </span>
                    {server.lastIp && (
                      <span className="flex items-center gap-1.5 text-blue-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Last IP: {server.lastIp}
                      </span>
                    )}
                  </div>

                    <div className="flex items-center gap-3">
                      {!server.stripeAccountId && (
                        <button
                          onClick={() => startOnboarding(server.id)}
                          className="flex items-center gap-2 bg-[#7c6af7]/10 hover:bg-[#7c6af7]/20 border border-[#7c6af7]/30 text-[#7c6af7] px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          Setup Payments
                        </button>
                      )}
                      {server.stripeAccountId && (
                        <button
                          onClick={() => openStripeDashboard(server.id)}
                          className="flex items-center gap-2 bg-[#7c6af7]/10 hover:bg-[#7c6af7]/20 border border-[#7c6af7]/30 text-[#7c6af7] px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Earnings & Payouts
                        </button>
                      )}
                      
                      <Link
                        href={`/dashboard/sales/${server.id}`}
                        className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        Sales History
                      </Link>

                      <button
                        onClick={() => handleExpandServer(server)}
                        className="flex items-center gap-2 bg-[#1e1e30] hover:bg-[#2a2a4a] text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Pricing Settings
                      </button>
                      <button
                        onClick={() => deleteServer(server.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
                          confirmingDelete === server.id 
                          ? "bg-red-500 hover:bg-red-600 text-white border-red-500" 
                          : "bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/20"
                        }`}
                      >
                        {confirmingDelete === server.id ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Confirm?
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                
                {expandedServerId === server.id && (
                  <div className="mt-6 pt-6 border-t border-[#1e1e30]">
                    <h4 className="text-white font-medium text-sm mb-4">In-game Pricing Configuration</h4>
                    <p className="text-[#6b6b8a] text-xs mb-6">Set the price for 1 Cash. This determines how much real-world money players pay for 1 in-game Cash point.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      {/* USD */}
                      <div className="bg-[#0a0a0f] p-4 rounded-xl border border-[#2a2a4a]">
                        <label className="flex items-center gap-3 mb-3 cursor-pointer">
                          <input type="checkbox" checked={pricingForm.usd} onChange={(e) => setPricingForm({...pricingForm, usd: e.target.checked})} className="w-4 h-4 accent-[#7c6af7] bg-[#111118] border-[#2a2a4a] rounded" />
                          <span className="text-white text-sm font-medium">Accept USD ($)</span>
                        </label>
                        <div className={`transition-opacity ${!pricingForm.usd ? 'opacity-30 pointer-events-none' : ''}`}>
                          <label className="text-[#6b6b8a] text-xs mb-2 block">Price per 1 Cash ($)</label>
                          <div className="flex items-center bg-[#111118] border border-[#2a2a4a] rounded-lg relative">
                            <span className="absolute left-3 text-[#6b6b8a]">$</span>
                            <input type="number" step="0.01" min="0.01" value={pricingForm.priceUSD} onChange={(e) => setPricingForm({...pricingForm, priceUSD: e.target.value})} className="w-full bg-transparent pl-8 pr-2 py-2 text-white text-sm focus:outline-none appearance-none" />
                          </div>
                        </div>
                      </div>
                      
                      {/* BRL */}
                      <div className="bg-[#0a0a0f] p-4 rounded-xl border border-[#2a2a4a]">
                        <label className="flex items-center gap-3 mb-3 cursor-pointer">
                          <input type="checkbox" checked={pricingForm.brl} onChange={(e) => setPricingForm({...pricingForm, brl: e.target.checked})} className="w-4 h-4 accent-[#7c6af7] bg-[#111118] border-[#2a2a4a] rounded" />
                          <span className="text-white text-sm font-medium">Accept BRL (R$)</span>
                        </label>
                        <div className={`transition-opacity ${!pricingForm.brl ? 'opacity-30 pointer-events-none' : ''}`}>
                          <label className="text-[#6b6b8a] text-xs mb-2 block">Price per 1 Cash (R$)</label>
                          <div className="flex items-center bg-[#111118] border border-[#2a2a4a] rounded-lg relative">
                            <span className="absolute left-3 text-[#6b6b8a]">R$</span>
                            <input type="number" step="0.01" min="0.01" value={pricingForm.priceBRL} onChange={(e) => setPricingForm({...pricingForm, priceBRL: e.target.value})} className="w-full bg-transparent pl-9 pr-2 py-2 text-white text-sm focus:outline-none appearance-none" />
                          </div>
                        </div>
                      </div>
                      
                      {/* EUR */}
                      <div className="bg-[#0a0a0f] p-4 rounded-xl border border-[#2a2a4a]">
                        <label className="flex items-center gap-3 mb-3 cursor-pointer">
                          <input type="checkbox" checked={pricingForm.eur} onChange={(e) => setPricingForm({...pricingForm, eur: e.target.checked})} className="w-4 h-4 accent-[#7c6af7] bg-[#111118] border-[#2a2a4a] rounded" />
                          <span className="text-white text-sm font-medium">Accept EUR (€)</span>
                        </label>
                        <div className={`transition-opacity ${!pricingForm.eur ? 'opacity-30 pointer-events-none' : ''}`}>
                          <label className="text-[#6b6b8a] text-xs mb-2 block">Price per 1 Cash (€)</label>
                          <div className="flex items-center bg-[#111118] border border-[#2a2a4a] rounded-lg relative">
                            <span className="absolute left-3 text-[#6b6b8a]">€</span>
                            <input type="number" step="0.01" min="0.01" value={pricingForm.priceEUR} onChange={(e) => setPricingForm({...pricingForm, priceEUR: e.target.value})} className="w-full bg-transparent pl-8 pr-2 py-2 text-white text-sm focus:outline-none appearance-none" />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col md:flex-row md:items-end gap-6 justify-between">
                      <div className="flex-1 w-full max-w-sm">
                        <label className="text-[#6b6b8a] text-xs mb-2 block">Default Fallback Currency</label>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => setPricingForm({...pricingForm, defaultCur: "usd"})} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors border ${pricingForm.defaultCur === "usd" ? "bg-[#7c6af7]/20 text-[#7c6af7] border-[#7c6af7]/50" : "bg-[#0a0a0f] text-[#6b6b8a] border-[#2a2a4a]"}`}>USD</button>
                          <button type="button" onClick={() => setPricingForm({...pricingForm, defaultCur: "brl"})} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors border ${pricingForm.defaultCur === "brl" ? "bg-[#7c6af7]/20 text-[#7c6af7] border-[#7c6af7]/50" : "bg-[#0a0a0f] text-[#6b6b8a] border-[#2a2a4a]"}`}>BRL</button>
                          <button type="button" onClick={() => setPricingForm({...pricingForm, defaultCur: "eur"})} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors border ${pricingForm.defaultCur === "eur" ? "bg-[#7c6af7]/20 text-[#7c6af7] border-[#7c6af7]/50" : "bg-[#0a0a0f] text-[#6b6b8a] border-[#2a2a4a]"}`}>EUR</button>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSyncPricing(server)}
                        className="bg-[#7c6af7] hover:bg-[#6a58e0] text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
                      >
                        Save & Sync to Server
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )})}
          </div>
        )}
      </main>
    </div>
  );
}
