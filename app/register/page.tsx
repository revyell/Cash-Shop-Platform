"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function RegisterContent() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!acceptedTerms) {
      setError("You must accept the Terms of Service to create an account.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name, acceptedTerms }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Registration failed.");
      setLoading(false);
    } else {
      router.push(`/login?registered=1${callbackUrl !== "/dashboard" ? `&callbackUrl=${callbackUrl}` : ""}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1a1a2e] border border-[#2a2a4a] mb-4">
            <svg className="w-7 h-7 text-[#7c6af7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Create Account</h1>
          <p className="text-[#6b6b8a] text-sm mt-1">Start accepting payments in minutes</p>
        </div>

        <div className="bg-[#111118] border border-[#1e1e30] rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#9898b8] mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#0a0a0f] border border-[#2a2a4a] rounded-xl px-4 py-3 text-white text-sm placeholder-[#3a3a5a] focus:outline-none focus:border-[#7c6af7] transition-colors"
                placeholder="Your name or server name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#9898b8] mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0a0a0f] border border-[#2a2a4a] rounded-xl px-4 py-3 text-white text-sm placeholder-[#3a3a5a] focus:outline-none focus:border-[#7c6af7] transition-colors"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#9898b8] mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0a0a0f] border border-[#2a2a4a] rounded-xl px-4 py-3 text-white text-sm placeholder-[#3a3a5a] focus:outline-none focus:border-[#7c6af7] transition-colors"
                placeholder="At least 8 characters"
                required
                minLength={8}
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
                {error}
              </p>
            )}

            <div className="flex items-start gap-3 mt-4 mb-6">
              <input
                type="checkbox"
                id="terms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 w-4 h-4 bg-[#0a0a0f] border border-[#2a2a4a] rounded text-[#7c6af7] focus:ring-[#7c6af7] focus:ring-offset-[#111118]"
              />
              <label htmlFor="terms" className="text-sm text-[#6b6b8a]">
                I agree to the <span className="text-[#7c6af7] cursor-pointer hover:underline">Terms of Service</span> and <span className="text-[#7c6af7] cursor-pointer hover:underline">Privacy Policy</span>, and I acknowledge that I am responsible for managing my server's virtual economy in accordance with Mojang's EULA.
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#7c6af7] hover:bg-[#6a58e0] disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors text-sm"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-[#6b6b8a] mt-6">
            Already have an account?{" "}
            <Link href={`/login${callbackUrl !== "/dashboard" ? `?callbackUrl=${callbackUrl}` : ""}`} className="text-[#7c6af7] hover:text-[#9d8fff] transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f]" />}>
      <RegisterContent />
    </Suspense>
  );
}
