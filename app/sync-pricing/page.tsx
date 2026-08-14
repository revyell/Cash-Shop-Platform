"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function SyncPricingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const nextUrl = searchParams.get("next");
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (nextUrl) {
            window.location.href = nextUrl;
          } else {
            router.push("/dashboard?pricing=success");
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mb-6">
        <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-2xl font-semibold text-white mb-2">Syncing Pricing...</h1>
      <p className="text-[#6b6b8a] text-sm max-w-md">
        Your pricing configuration has been sent to your Minecraft server!
        You will be redirected in {countdown} seconds.
      </p>
    </div>
  );
}

export default function SyncPricingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f]" />}>
      <SyncPricingContent />
    </Suspense>
  );
}
