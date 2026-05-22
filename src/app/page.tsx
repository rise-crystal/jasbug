'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createOrder } from '@/lib/actions';

export default function Home() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await createOrder(phoneNumber, 'computer-bug');
      if (result.error) {
        setError(result.error);
      } else if (result.orderId) {
        // Redirect ke payment page dengan order ID
        router.push(`/payment?order=${result.orderId}`);
      }
    } catch (err) {
      setError('Terjadi kesalahan pada sistem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,0,0,0.05)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-3 sm:p-4">
        <div className="w-full max-w-lg">
          {/* Warning Banner */}
          <div className="bg-gradient-to-r from-red-600 to-orange-600 text-center py-2 px-3 sm:px-4 rounded-t-2xl">
            <p className="text-white font-bold text-xs sm:text-sm animate-pulse">
              ⚠️ DANGER ZONE - POWER BUG ACTIVATED ⚠️
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-gray-900 border-x-2 border-b-2 border-red-500/50 rounded-b-2xl shadow-2xl shadow-red-500/20 p-4 sm:p-6 md:p-8">
            {/* Product Display */}
            <div className="text-center mb-4 sm:mb-6">
              <div className="relative inline-block">
                {/* Glowing Ring Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 rounded-full blur-xl opacity-50 animate-pulse"></div>

                <div className="relative bg-gradient-to-br from-red-950 to-gray-900 rounded-2xl p-4 sm:p-6 border-2 border-red-500/50 mb-4">
                  <div className="w-32 h-32 sm:w-40 sm:h-40 mx-auto relative">
                    {/* Scan Line Effect */}
                    <div className="absolute inset-0 overflow-hidden rounded-lg">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-red-500/50 animate-[scanline_2s_linear_infinite]"></div>
                    </div>
                    <img
                      src="https://media.tenor.com/1B8g80k8vC4AAAAi/gf.gif"
                      alt="Power Bug"
                      className="w-full h-full object-contain rounded-lg relative z-10"
                    />
                  </div>

                  {/* Warning Badges */}
                  <div className="flex justify-center gap-2 mt-3">
                    <span className="bg-red-600 text-white text-xs font-bold px-2 sm:px-3 py-1 rounded-full animate-pulse">
                      🔥 POWERFUL
                    </span>
                    <span className="bg-orange-600 text-white text-xs font-bold px-2 sm:px-3 py-1 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}>
                      ⚡ DESTRUCTIVE
                    </span>
                  </div>
                </div>
              </div>

              {/* Product Title with Glitch Effect */}
              <h2 className="text-3xl sm:text-4xl font-black mb-2 relative inline-block">
                <span className="bg-gradient-to-r from-red-500 via-orange-500 to-red-500 bg-clip-text text-transparent animate-[glitch_1s_ease-in-out_infinite]">
                  POWER BUG
                </span>
                <span className="text-3xl sm:text-4xl ml-2">🔥</span>
              </h2>
              <p className="text-gray-400 text-xs sm:text-sm mb-4">Ultimate Bug & Malware Collection</p>

              {/* Price Tag */}
              <div className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-gradient-to-r from-red-600 to-orange-600 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-full font-black text-lg sm:text-xl shadow-lg shadow-red-500/50">
                <span><span className="text-xs sm:text-sm font-normal">Rp</span> 5.000</span>
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold uppercase">
                  Diskon 50%
                </span>
                <span className="text-xs sm:text-sm font-semibold italic text-white/80 line-through">
                  Rp 10.000
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4 sm:mt-6">
                <div className="bg-gray-800 rounded-lg p-2 sm:p-3 border border-red-500/30">
                  <div className="text-xl sm:text-2xl mb-1">💀</div>
                  <div className="text-white font-bold text-xs sm:text-sm">Deadly</div>
                  <div className="text-gray-400 text-xs">Power</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-2 sm:p-3 border border-orange-500/30">
                  <div className="text-xl sm:text-2xl mb-1">⚡</div>
                  <div className="text-white font-bold text-xs sm:text-sm">Instant</div>
                  <div className="text-gray-400 text-xs">Effect</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-2 sm:p-3 border border-red-500/30">
                  <div className="text-xl sm:text-2xl mb-1">🎯</div>
                  <div className="text-white font-bold text-xs sm:text-sm">Precise</div>
                  <div className="text-gray-400 text-xs">Target</div>
                </div>
              </div>
            </div>

            {/* Divider with Warning */}
            <div className="flex items-center gap-3 my-4 sm:my-6">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>
              <span className="text-red-500 text-xs font-bold whitespace-nowrap">⚠️ TARGET INPUT</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>
            </div>

            {/* Checkout Form */}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <div>
                <label
                  htmlFor="phoneNumber"
                  className="block text-xs sm:text-sm font-bold text-red-400 mb-2 uppercase tracking-wider"
                >
                  📱 Nomor Telepon Target
                </label>
                <input
                  type="tel"
                  id="phoneNumber"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className="w-full px-3 sm:px-4 py-3 bg-gray-800 border-2 border-red-500/50 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition font-mono text-sm sm:text-base"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-900/50 border-2 border-red-500 text-red-200 px-3 sm:px-4 py-3 rounded-lg text-xs sm:text-sm">
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-black py-3 sm:py-4 rounded-lg transition-all duration-200 cursor-pointer disabled:cursor-not-allowed text-base sm:text-lg shadow-lg shadow-red-500/50 hover:shadow-red-500/80 transform hover:scale-105 disabled:transform-none"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      DEPLOYING...
                    </>
                  ) : (
                    <>
                      🚀 DEPLOY POWER BUG NOW
                    </>
                  )}
                </span>
                {!loading && (
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                )}
              </button>
            </form>

            {/* Action Buttons */}
            <div className="mt-4 sm:mt-5 space-y-3">
              <a
                href="/orders"
                className="block w-full text-center bg-gray-800 hover:bg-gray-700 border-2 border-orange-500/50 hover:border-orange-500 text-orange-500 hover:text-orange-400 font-bold py-3 rounded-lg transition duration-200 text-sm sm:text-base"
              >
                📋 Monitor All Attacks
              </a>
              <p className="text-center text-xs text-gray-500">
                ⚡ Bug deployed instantly after order created
              </p>
            </div>
          </div>

          {/* Footer Warning */}
          <div className="text-center mt-4">
            <p className="text-gray-600 text-xs">
              🔒 Secure Deployment • ⚡ Instant Effect • 💯 Power Guaranteed
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
