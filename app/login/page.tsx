"use client";
import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password.");
      setLoading(false);
    } else {
      router.push(callbackUrl);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1a1a2e] border border-[#2a2a4a] mb-4">
            <svg className="w-7 h-7 text-[#7c6af7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Revyell&apos;s Cash</h1>
          <p className="text-[#6b6b8a] text-sm mt-1">Sign in to your dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-[#111118] border border-[#1e1e30] rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
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
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#7c6af7] hover:bg-[#6a58e0] disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors text-sm"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-[#6b6b8a] mt-6">
            Don&apos;t have an account?{" "}
            <Link href={`/register${callbackUrl !== "/dashboard" ? `?callbackUrl=${callbackUrl}` : ""}`} className="text-[#7c6af7] hover:text-[#9d8fff] transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f]" />}>
      <LoginContent />
    </Suspense>
  );
}
