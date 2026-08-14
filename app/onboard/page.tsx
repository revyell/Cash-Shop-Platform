"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function OnboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [name, setName] = useState("Minecraft Server");
  const [currencies, setCurrencies] = useState({ brl: true, usd: true, eur: true });
  const [defaultCur, setDefaultCur] = useState("brl");
  const [prices, setPrices] = useState({ brl: 1, usd: 1, eur: 1 });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/onboard");
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    const acceptedList = Object.keys(currencies).filter(k => currencies[k as keyof typeof currencies]);
    if (acceptedList.length === 0) {
      alert("Please select at least one currency.");
      setCreating(false);
      return;
    }
    
    // Ensure default currency is one of the accepted ones
    const finalDefault = acceptedList.includes(defaultCur) ? defaultCur : acceptedList[0];

    try {
      const res = await fetch("/api/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          priceBRL: prices.brl,
          priceUSD: prices.usd,
          priceEUR: prices.eur,
          acceptedCurrencies: acceptedList.join(","),
          defaultCurrency: finalDefault
        }),
      });
      if (res.ok) {
        const server = await res.json();
        // Redirect to sync-pricing first, which will then redirect to link-success
        const syncUrl = `/sync-pricing?currencies=${acceptedList.join(",")}&default=${finalDefault}&usd=${prices.usd}&brl=${prices.brl}&eur=${prices.eur}&next=/link-success?token=${server.serverToken}`;
        window.location.href = syncUrl;
      } else {
        alert("Failed to create server.");
        setCreating(false);
      }
    } catch (e) {
      console.error(e);
      setCreating(false);
    }
  };

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#7c6af7] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6 py-12">
      <div className="max-w-xl w-full bg-[#111118] border border-[#1e1e30] rounded-2xl p-8 shadow-xl">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#7c6af7]/10 flex items-center justify-center mx-auto mb-4 border border-[#7c6af7]/20">
            <svg className="w-7 h-7 text-[#7c6af7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Configure Your Server</h1>
          <p className="text-[#6b6b8a] text-sm mt-1">
            Set up your server's name and economy before linking.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Server Name */}
          <div>
            <label className="block text-sm font-medium text-[#9898b8] mb-2">Server Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#0a0a0f] border border-[#2a2a4a] rounded-xl px-4 py-3 text-white text-sm placeholder-[#3a3a5a] focus:outline-none focus:border-[#7c6af7] transition-colors"
              placeholder="e.g. My Awesome Server"
              required
            />
          </div>

          <div className="border-t border-[#1e1e30] pt-6">
            <h3 className="text-white font-medium mb-4">Economy Settings</h3>
            
            <div className="space-y-4">
              {/* BRL */}
              <div className="flex items-center justify-between p-4 bg-[#0a0a0f] border border-[#1e1e30] rounded-xl">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={currencies.brl}
                    onChange={(e) => setCurrencies({...currencies, brl: e.target.checked})}
                    className="w-4 h-4 rounded text-[#7c6af7] bg-[#111118] border-[#2a2a4a] focus:ring-[#7c6af7]"
                  />
                  <div>
                    <div className="text-white font-medium">BRL (Brazilian Real)</div>
                    <div className="text-xs text-[#6b6b8a]">Amount of Cash per R$ 1,00</div>
                  </div>
                </div>
                {currencies.brl && (
                  <div className="flex items-center bg-[#111118] border border-[#2a2a4a] rounded-lg">
                    <button type="button" onClick={() => setPrices(p => ({...p, brl: Math.max(1, p.brl - 1)}))} className="px-3 py-2 text-[#6b6b8a] hover:text-white border-r border-[#2a2a4a]">-</button>
                    <input
                      type="number"
                      min="1"
                      value={prices.brl}
                      onChange={(e) => setPrices({...prices, brl: parseInt(e.target.value) || 0})}
                      className="w-16 bg-transparent px-2 py-2 text-white text-sm text-center outline-none appearance-none"
                    />
                    <button type="button" onClick={() => setPrices(p => ({...p, brl: p.brl + 1}))} className="px-3 py-2 text-[#6b6b8a] hover:text-white border-l border-[#2a2a4a]">+</button>
                  </div>
                )}
              </div>

              {/* USD */}
              <div className="flex items-center justify-between p-4 bg-[#0a0a0f] border border-[#1e1e30] rounded-xl">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={currencies.usd}
                    onChange={(e) => setCurrencies({...currencies, usd: e.target.checked})}
                    className="w-4 h-4 rounded text-[#7c6af7] bg-[#111118] border-[#2a2a4a] focus:ring-[#7c6af7]"
                  />
                  <div>
                    <div className="text-white font-medium">USD (US Dollar)</div>
                    <div className="text-xs text-[#6b6b8a]">Amount of Cash per $ 1.00</div>
                  </div>
                </div>
                {currencies.usd && (
                  <div className="flex items-center bg-[#111118] border border-[#2a2a4a] rounded-lg">
                    <button type="button" onClick={() => setPrices(p => ({...p, usd: Math.max(1, p.usd - 1)}))} className="px-3 py-2 text-[#6b6b8a] hover:text-white border-r border-[#2a2a4a]">-</button>
                    <input
                      type="number"
                      min="1"
                      value={prices.usd}
                      onChange={(e) => setPrices({...prices, usd: parseInt(e.target.value) || 0})}
                      className="w-16 bg-transparent px-2 py-2 text-white text-sm text-center outline-none appearance-none"
                    />
                    <button type="button" onClick={() => setPrices(p => ({...p, usd: p.usd + 1}))} className="px-3 py-2 text-[#6b6b8a] hover:text-white border-l border-[#2a2a4a]">+</button>
                  </div>
                )}
              </div>

              {/* EUR */}
              <div className="flex items-center justify-between p-4 bg-[#0a0a0f] border border-[#1e1e30] rounded-xl">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={currencies.eur}
                    onChange={(e) => setCurrencies({...currencies, eur: e.target.checked})}
                    className="w-4 h-4 rounded text-[#7c6af7] bg-[#111118] border-[#2a2a4a] focus:ring-[#7c6af7]"
                  />
                  <div>
                    <div className="text-white font-medium">EUR (Euro)</div>
                    <div className="text-xs text-[#6b6b8a]">Amount of Cash per € 1.00</div>
                  </div>
                </div>
                {currencies.eur && (
                  <div className="flex items-center bg-[#111118] border border-[#2a2a4a] rounded-lg">
                    <button type="button" onClick={() => setPrices(p => ({...p, eur: Math.max(1, p.eur - 1)}))} className="px-3 py-2 text-[#6b6b8a] hover:text-white border-r border-[#2a2a4a]">-</button>
                    <input
                      type="number"
                      min="1"
                      value={prices.eur}
                      onChange={(e) => setPrices({...prices, eur: parseInt(e.target.value) || 0})}
                      className="w-16 bg-transparent px-2 py-2 text-white text-sm text-center outline-none appearance-none"
                    />
                    <button type="button" onClick={() => setPrices(p => ({...p, eur: p.eur + 1}))} className="px-3 py-2 text-[#6b6b8a] hover:text-white border-l border-[#2a2a4a]">+</button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-6">
              <label className="block text-sm font-medium text-[#9898b8] mb-3">Default Global Currency</label>
              <div className="flex items-center gap-3">
                {currencies.brl && (
                  <button
                    type="button"
                    onClick={() => setDefaultCur("brl")}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors border ${defaultCur === "brl" ? "bg-[#7c6af7]/20 text-[#7c6af7] border-[#7c6af7]/50" : "bg-[#0a0a0f] text-[#6b6b8a] border-[#2a2a4a] hover:border-[#3a3a5a]"}`}
                  >
                    BRL (R$)
                  </button>
                )}
                {currencies.usd && (
                  <button
                    type="button"
                    onClick={() => setDefaultCur("usd")}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors border ${defaultCur === "usd" ? "bg-[#7c6af7]/20 text-[#7c6af7] border-[#7c6af7]/50" : "bg-[#0a0a0f] text-[#6b6b8a] border-[#2a2a4a] hover:border-[#3a3a5a]"}`}
                  >
                    USD ($)
                  </button>
                )}
                {currencies.eur && (
                  <button
                    type="button"
                    onClick={() => setDefaultCur("eur")}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors border ${defaultCur === "eur" ? "bg-[#7c6af7]/20 text-[#7c6af7] border-[#7c6af7]/50" : "bg-[#0a0a0f] text-[#6b6b8a] border-[#2a2a4a] hover:border-[#3a3a5a]"}`}
                  >
                    EUR (€)
                  </button>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={creating}
            className="w-full bg-[#7c6af7] hover:bg-[#6a58e0] disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors text-sm mt-8"
          >
            {creating ? "Creating & Linking..." : "Create Server"}
          </button>
        </form>
      </div>
    </div>
  );
}
