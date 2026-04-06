'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';

interface Order {
  id: string;
  custom_id: string;
  phone_number: string;
  status: string;
  product_id: string | null;
  payment_amount: number | null;
  payment_proof_url: string | null;
  payment_proof_verified: boolean | null;
  payment_proof_verified_at: string | null;
  created_at: string;
}

const productMap: Record<string, { name: string; image: string }> = {
  'computer-bug': { name: 'Power Bug 🔥', image: 'https://media.tenor.com/1B8g80k8vC4AAAAi/gf.gif' },
};

const supabase = getSupabase();

export default function AdminPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      console.error('Supabase client not initialized');
      setLoading(false);
      return;
    }

    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .not('payment_proof_url', 'is', null)
        .eq('payment_proof_verified', false)
        .order('created_at', { ascending: false });

      if (data) setOrders(data);
      setLoading(false);
    };

    fetchOrders();
    const channel = supabase.channel('admin-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleLogout = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.push('/admin/login');
    router.refresh();
  };

  const handleVerify = async (orderId: string, verified: boolean) => {
    setVerifyingId(orderId);
    try {
      const response = await fetch(`/api/payment/verify/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal verifikasi');
      setOrders(prev => prev.filter(o => o.id !== orderId));
      alert(verified ? '✅ Pembayaran berhasil diverifikasi!' : '❌ Pembayaran ditolak');
    } catch (error) {
      console.error('Verify error:', error);
      alert('❌ Gagal verifikasi: ' + (error as Error).message);
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 relative overflow-hidden py-8 px-4">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(168,85,247,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(168,85,247,0.05)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-center py-6 px-6 rounded-t-2xl mb-6 shadow-2xl shadow-purple-500/30">
          <div className="flex items-center justify-center gap-3 mb-2">
            <h1 className="text-4xl font-black text-white">🔐 ADMIN VERIFIKASI</h1>
            <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">ADMIN ONLY</span>
          </div>
          <p className="text-purple-100 text-sm">Periksa & verifikasi pembayaran</p>
        </div>

        <div className="bg-gray-900 border-2 border-purple-500/50 p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="bg-purple-900/50 border border-purple-500/30 rounded-lg px-4 py-2">
              <span className="text-2xl font-black text-purple-400">{orders.length}</span>
              <span className="text-sm text-gray-400 ml-2">Verifikasi</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <a href="/admin/orders" className="bg-gray-800 hover:bg-gray-700 border-2 border-cyan-500/50 text-cyan-500 font-bold py-2 px-4 rounded-lg transition">📊 Semua Orders</a>
              <a href="/orders" className="bg-gray-800 hover:bg-gray-700 border-2 border-blue-500/50 text-blue-500 font-bold py-2 px-4 rounded-lg transition">📋 Public Orders</a>
              <button onClick={handleLogout} className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold py-2 px-4 rounded-lg transition">🚪 Logout</button>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border-2 border-purple-500/50 rounded-b-2xl p-6 shadow-2xl shadow-purple-500/20">
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto"></div>
              <p className="mt-6 text-gray-400 text-lg">Memuat data...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-7xl mb-4">✅</div>
              <p className="text-gray-400 text-xl font-bold mb-2">Semua sudah diverifikasi!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const product = order.product_id ? productMap[order.product_id] : null;
                return (
                  <div key={order.id} className="bg-gray-800 border-2 border-purple-500/30 hover:border-purple-500/70 rounded-xl p-5 transition-all">
                    <div className="flex flex-col lg:flex-row gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="font-mono text-xs text-purple-400 bg-gray-900 px-3 py-1.5 rounded-lg border border-purple-500/30 font-bold">{order.custom_id || order.id}</span>
                          <span className="text-xs text-gray-600">|</span>
                          <span className="text-xs text-gray-500">{new Date(order.created_at).toLocaleString('id-ID')}</span>
                        </div>
                        {product && (
                          <div className="flex items-center gap-3 mb-3 p-3 bg-gray-900 rounded-lg border border-purple-500/20">
                            <img src={product.image} alt={product.name} className="w-12 h-12 object-contain" />
                            <div><p className="text-sm font-bold text-gray-300">{product.name}</p><p className="text-xs text-gray-500">Digital Payload</p></div>
                          </div>
                        )}
                        <p className="text-gray-300 font-medium mb-2">📱 <span className="font-mono text-orange-400">{order.phone_number}</span></p>
                        {order.payment_amount && <div className="bg-gradient-to-r from-orange-600 to-red-600 inline-block rounded-lg px-4 py-2"><p className="text-white font-black text-lg">💰 Rp {order.payment_amount.toLocaleString('id-ID')}</p></div>}
                      </div>

                      <div className="lg:w-80 space-y-3">
                        <div className="bg-gray-900 rounded-lg p-4 border border-purple-500/30">
                          <p className="text-xs text-gray-400 mb-3 font-bold uppercase tracking-wider">Bukti Pembayaran</p>
                          <button onClick={() => setSelectedProof(order.payment_proof_url)} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm font-bold py-3 px-4 rounded-lg transition">👁️ Lihat Bukti</button>
                        </div>
                        <div className="space-y-2">
                          <button onClick={() => handleVerify(order.id, true)} disabled={verifyingId === order.id} className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 px-4 rounded-lg transition disabled:cursor-not-allowed">
                            {verifyingId === order.id ? <span className="flex items-center justify-center gap-2"><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Processing...</span> : '✅ Setujui'}
                          </button>
                          <button onClick={() => handleVerify(order.id, false)} disabled={verifyingId === order.id} className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-2.5 px-4 rounded-lg transition disabled:cursor-not-allowed text-sm">❌ Tolak</button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedProof && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setSelectedProof(null)}>
          <div className="relative max-w-5xl max-h-full">
            <button onClick={() => setSelectedProof(null)} className="absolute -top-12 right-0 text-white hover:text-gray-300 font-bold text-xl">✕ Tutup</button>
            {selectedProof.endsWith('.pdf') ? <div className="bg-white rounded-lg p-4"><p className="text-gray-700 mb-2">📄 PDF</p><a href={selectedProof} target="_blank" className="text-blue-400 hover:underline font-bold">Buka PDF →</a></div> : <img src={selectedProof} alt="Bukti" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />}
          </div>
        </div>
      )}
    </main>
  );
}
