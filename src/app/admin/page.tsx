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
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (data) {
        // Auto-expire order yang sudah lewat 5 menit tanpa bukti pembayaran
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;

        const processedOrders = await Promise.all(
          data.map(async (order) => {
            const createdAt = new Date(order.created_at).getTime();
            const elapsed = now - createdAt;
            const remaining = fiveMinutes - elapsed;

            // Jika sudah expired dan belum ada bukti, auto-set ke expired
            if (remaining <= 0 && !order.payment_proof_url && order.status === 'pending') {
              try {
                console.log('⏰ Auto-expiring order:', order.custom_id || order.id);
                console.log('📝 Calling API to update status to expired...');
                
                const response = await fetch(`/api/payment/status/${order.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'expired' }),
                });

                const result = await response.json();
                console.log('API Response Status:', response.status);
                console.log('API Response Data:', result);

                if (response.ok) {
                  console.log('✅ SUCCESS: Order expired in database via API');
                  return { ...order, status: 'expired' };
                } else {
                  console.error('❌ FAILED: API error:', result.error);
                  return order; // Return original order if failed
                }
              } catch (error) {
                console.error('❌ FAILED: Auto-expire error:', error);
                return order; // Return original order if error
              }
            }

            return order;
          })
        );

        // Filter hanya order yang masih pending (yang expired akan otomatis terfilter)
        setOrders(processedOrders.filter(o => o.status === 'pending'));
      }
      setLoading(false);
    };

    fetchOrders();
    const channel = supabase.channel('admin-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        console.log('🔄 Admin: Realtime update detected, refetching orders...');
        fetchOrders();
      })
      .subscribe();

    // BACKUP: Polling setiap 10 detik untuk memastikan data terupdate
    const pollingInterval = setInterval(() => {
      console.log('📡 Admin: Polling - Refetching orders for auto-expire check...');
      fetchOrders();
    }, 10000); // 10 seconds

    return () => { 
      supabase.removeChannel(channel);
      clearInterval(pollingInterval);
      console.log('Cleanup admin subscriptions');
    };
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
      
      // Tampilkan pesan yang sesuai berdasarkan hasil verifikasi
      if (verified) {
        alert('✅ Pembayaran berhasil diverifikasi!');
      } else if (data.hasPaymentProof) {
        alert('❌ Pembayaran ditolak oleh admin');
      } else {
        alert('⏰ Order ditandai sebagai expired (otomatis gagal)');
      }
    } catch (error) {
      console.error('Verify error:', error);
      alert('❌ Gagal verifikasi: ' + (error as Error).message);
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 relative overflow-hidden py-4 sm:py-8 px-3 sm:px-4">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(168,85,247,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(168,85,247,0.05)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-center py-4 sm:py-6 px-4 sm:px-6 rounded-t-2xl mb-4 sm:mb-6 shadow-2xl shadow-purple-500/30">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mb-2">
            <h1 className="text-2xl sm:text-4xl font-black text-white">🔐 ADMIN VERIFIKASI</h1>
            <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">ADMIN ONLY</span>
          </div>
          <p className="text-purple-100 text-xs sm:text-sm">Periksa & verifikasi pembayaran</p>
        </div>

        <div className="bg-gray-900 border-2 border-purple-500/50 p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="bg-purple-900/50 border border-purple-500/30 rounded-lg px-3 sm:px-4 py-2">
              <span className="text-xl sm:text-2xl font-black text-purple-400">{orders.length}</span>
              <span className="text-xs sm:text-sm text-gray-400 ml-2">Verifikasi</span>
            </div>
            <div className="flex gap-2 flex-wrap w-full sm:w-auto">
              <a href="/admin/orders" className="flex-1 sm:flex-none text-center bg-gray-800 hover:bg-gray-700 border-2 border-cyan-500/50 text-cyan-500 font-bold py-2 px-3 sm:px-4 rounded-lg transition text-xs sm:text-base">📊 Semua Orders</a>
              <a href="/orders" className="flex-1 sm:flex-none text-center bg-gray-800 hover:bg-gray-700 border-2 border-blue-500/50 text-blue-500 font-bold py-2 px-3 sm:px-4 rounded-lg transition text-xs sm:text-base">📋 Public Orders</a>
              <button onClick={handleLogout} className="flex-1 sm:flex-none text-center bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold py-2 px-3 sm:px-4 rounded-lg transition text-xs sm:text-base">🚪 Logout</button>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border-2 border-purple-500/50 rounded-b-2xl p-4 sm:p-6 shadow-2xl shadow-purple-500/20">
          {loading ? (
            <div className="text-center py-12 sm:py-16">
              <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-4 border-purple-500 border-t-transparent mx-auto"></div>
              <p className="mt-4 sm:mt-6 text-gray-400 text-base sm:text-lg">Memuat data...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 sm:py-16">
              <div className="text-5xl sm:text-7xl mb-4">✅</div>
              <p className="text-gray-400 text-lg sm:text-xl font-bold mb-2">Semua sudah diverifikasi!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const product = order.product_id ? productMap[order.product_id] : null;
                return (
                  <div key={order.id} className="bg-gray-800 border-2 border-purple-500/30 hover:border-purple-500/70 rounded-xl p-4 sm:p-5 transition-all">
                    <div className="flex flex-col lg:flex-row gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className="font-mono text-xs text-purple-400 bg-gray-900 px-2 sm:px-3 py-1.5 rounded-lg border border-purple-500/30 font-bold truncate">{order.custom_id || order.id}</span>
                          <span className="text-xs text-gray-500">{new Date(order.created_at).toLocaleString('id-ID')}</span>
                        </div>
                        {product && (
                          <div className="flex items-center gap-2 sm:gap-3 mb-3 p-2 sm:p-3 bg-gray-900 rounded-lg border border-purple-500/20">
                            <img src={product.image} alt={product.name} className="w-10 h-10 sm:w-12 sm:h-12 object-contain flex-shrink-0" />
                            <div><p className="text-xs sm:text-sm font-bold text-gray-300">{product.name}</p><p className="text-xs text-gray-500">Digital Payload</p></div>
                          </div>
                        )}
                        <p className="text-gray-300 font-medium mb-2 text-xs sm:text-sm">📱 <span className="font-mono text-orange-400">{order.phone_number}</span></p>
                        {order.payment_amount && <div className="bg-gradient-to-r from-orange-600 to-red-600 inline-block rounded-lg px-3 sm:px-4 py-2"><p className="text-white font-black text-sm sm:text-lg">💰 Rp {order.payment_amount.toLocaleString('id-ID')}</p></div>}
                      </div>

                      <div className="lg:w-80 space-y-3">
                        {order.payment_proof_url ? (
                          <div className="bg-gray-900 rounded-lg p-3 sm:p-4 border border-purple-500/30">
                            <p className="text-xs text-gray-400 mb-3 font-bold uppercase tracking-wider">Bukti Pembayaran</p>
                            <button onClick={() => setSelectedProof(order.payment_proof_url)} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs sm:text-sm font-bold py-2 sm:py-3 px-3 sm:px-4 rounded-lg transition">👁️ Lihat Bukti</button>
                          </div>
                        ) : (
                          <div className="bg-red-900/30 rounded-lg p-3 sm:p-4 border-2 border-red-500/50">
                            <p className="text-xs text-red-400 mb-2 font-bold">⚠️ BELUM Upload Bukti</p>
                            <p className="text-xs text-gray-400 mb-2">Customer belum upload bukti pembayaran</p>
                            <p className="text-xs text-yellow-400 font-bold">💡 Klik "Tandai Expired" jika sudah lewat 5 menit</p>
                          </div>
                        )}
                        <div className="space-y-2">
                          <button 
                            onClick={() => handleVerify(order.id, true)} 
                            disabled={verifyingId === order.id || !order.payment_proof_url} 
                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-2 sm:py-3 px-3 sm:px-4 rounded-lg transition disabled:cursor-not-allowed text-xs sm:text-sm"
                          >
                            {verifyingId === order.id ? <span className="flex items-center justify-center gap-2"><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Processing...</span> : '✅ Setujui'}
                          </button>
                          <button 
                            onClick={() => handleVerify(order.id, false)} 
                            disabled={verifyingId === order.id} 
                            className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg transition disabled:cursor-not-allowed text-xs sm:text-sm"
                          >
                            {order.payment_proof_url ? '❌ Tolak' : '⏰ Tandai Expired'}
                          </button>
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
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-3 sm:p-4" onClick={() => setSelectedProof(null)}>
          <div className="relative max-w-5xl max-h-full w-full">
            <button onClick={() => setSelectedProof(null)} className="absolute -top-8 sm:-top-12 right-0 text-white hover:text-gray-300 font-bold text-lg sm:text-xl z-10">✕ Tutup</button>
            {selectedProof.endsWith('.pdf') ? <div className="bg-white rounded-lg p-3 sm:p-4"><p className="text-gray-700 mb-2 text-sm sm:text-base">📄 PDF</p><a href={selectedProof} target="_blank" className="text-blue-400 hover:underline font-bold text-sm sm:text-base">Buka PDF →</a></div> : <img src={selectedProof} alt="Bukti" className="w-full max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />}
          </div>
        </div>
      )}
    </main>
  );
}
