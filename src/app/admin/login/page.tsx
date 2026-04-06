'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      // Check content type
      const contentType = response.headers.get('content-type');
      
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        throw new Error('Server error. Periksa konfigurasi dan restart server.');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Login gagal');
      }

      // Redirect ke dashboard
      router.push('/admin');
      router.refresh();
    } catch (error) {
      console.error('Login error:', error);
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,0,0,0.05)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-center py-4 px-6 rounded-t-2xl">
          <h1 className="text-3xl font-black text-white">
            🔐 ADMIN LOGIN
          </h1>
          <p className="text-purple-100 text-sm mt-1">Masukkan password untuk melanjutkan</p>
        </div>

        {/* Login Form */}
        <div className="bg-gray-900 border-2 border-purple-500/50 rounded-b-2xl shadow-2xl shadow-purple-500/20 p-8">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🔑</div>
            <p className="text-gray-400 text-sm">
              Halaman ini hanya untuk administrator
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-bold text-purple-400 mb-2 uppercase tracking-wider"
              >
                Password Admin
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password..."
                className="w-full px-4 py-3 bg-gray-800 border-2 border-purple-500/50 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition font-mono"
                required
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-900/50 border-2 border-red-500 text-red-200 px-4 py-3 rounded-lg">
                ❌ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-black py-4 rounded-lg transition-all duration-200 disabled:cursor-not-allowed text-lg shadow-lg shadow-purple-500/50 hover:shadow-purple-500/80 transform hover:scale-105 disabled:transform-none"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    LOGGING IN...
                  </>
                ) : (
                  <>
                    🚀 LOGIN
                  </>
                )}
              </span>
            </button>
          </form>

          {/* Back Link */}
          <div className="mt-5">
            <a
              href="/"
              className="block w-full text-center bg-gray-800 hover:bg-gray-700 border-2 border-orange-500/50 hover:border-orange-500 text-orange-500 hover:text-orange-400 font-bold py-3 rounded-lg transition duration-200"
            >
              ← Kembali ke Home
            </a>
          </div>

          {/* Hint */}
          <div className="mt-4 bg-blue-900/30 border border-blue-500/30 rounded-lg p-3">
            <p className="text-blue-400 text-xs text-center">
              💡 Default password ada di file <code className="bg-gray-800 px-1 rounded">.env.local</code>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-4">
          <p className="text-gray-600 text-xs">
            🔒 Secure Admin Access • Session valid 24 jam
          </p>
        </div>
      </div>
    </main>
  );
}
