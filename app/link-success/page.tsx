"use client";

export default function LinkSuccessPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6 text-center">
      <div>
        <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Success!</h1>
        <p className="text-[#6b6b8a]">You can close this window now.</p>
      </div>
    </div>
  );
}
