'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { formatJakartaDateTime } from '@/lib/payment-expiry';

interface Order {
  id: string;
  custom_id: string | null;
  phone_number: string;
  status: string;
  product_id: string | null;
  payment_amount: number | null;
  payment_proof_url: string | null;
  payment_proof_verified: boolean | null;
  created_at: string;
}

const productMap: Record<string, { name: string; image: string }> = {
  'computer-bug': { name: 'Power Bug 🔥', image: 'https://media.tenor.com/1B8g80k8vC4AAAAi/gf.gif' },
};

const supabase = getSupabase();
const normalizeOrderStatus = (status: string) => status === 'pending' ? 'pending_pembayaran' : status;
const isPendingStatus = (status: string) => ['pending', 'pending_pembayaran', 'pending_konfirmasi_admin'].includes(status);
const matchesStatusFilter = (status: string, filterStatus: string) => {
  if (filterStatus === 'all') return true;
  if (filterStatus === 'pending') return isPendingStatus(status);

  return normalizeOrderStatus(status) === filterStatus;
};

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

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
        .order('created_at', { ascending: false });

      if (data) {
        setOrders(data);
      }
      setLoading(false);
    };

    fetchOrders();

    // NOTE: Realtime WebSocket is blocked by CSP, so we use polling only
    // Polling setiap 15 detik untuk memastikan data selalu terupdate
    const pollingInterval = setInterval(() => {
      console.log('📡 Admin: Polling - Refetching orders...');
      fetchOrders();
    }, 15000); // 15 seconds

    return () => {
      clearInterval(pollingInterval);
      console.log('Cleanup admin orders polling');
    };
  }, []);

  const handleLogout = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.push('/admin/login');
    router.refresh();
  };

  const toggleSelectAll = () => {
    if (selectedOrders.size === paginatedOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(paginatedOrders.map(o => o.id)));
    }
  };

  const toggleSelectOrder = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedOrders.size === 0) return;
    
    const confirmed = confirm(`Yakin ingin menghapus ${selectedOrders.size} order?`);
    if (!confirmed) return;

    if (!supabase) {
      alert('Database error');
      return;
    }

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .in('id', Array.from(selectedOrders));

      if (error) throw error;

      setOrders(prev => prev.filter(o => !selectedOrders.has(o.id)));
      setSelectedOrders(new Set());
      alert(`✅ ${selectedOrders.size} order berhasil dihapus!`);
    } catch (error) {
      console.error('Delete error:', error);
      alert('❌ Gagal menghapus order');
    } finally {
      setDeleting(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchQuery === '' ||
      order.custom_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.phone_number?.includes(searchQuery);
    const matchesStatus = matchesStatusFilter(order.status, filterStatus);
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / rowsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, rowsPerPage]);

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-900/50 border-yellow-500/50 text-yellow-400',
    pending_pembayaran: 'bg-yellow-900/50 border-yellow-500/50 text-yellow-400',
    pending_konfirmasi_admin: 'bg-orange-900/50 border-orange-500/50 text-orange-400',
    berhasil: 'bg-green-900/50 border-green-500/50 text-green-400',
    gagal: 'bg-red-900/50 border-red-500/50 text-red-400',
    expired: 'bg-orange-900/50 border-orange-500/50 text-orange-400',
  };

  return (
    <main className="min-h-screen bg-gray-950 relative overflow-hidden py-4 sm:py-8 px-3 sm:px-4">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(168,85,247,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(168,85,247,0.05)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-center py-4 sm:py-6 px-4 sm:px-6 rounded-t-2xl mb-4 sm:mb-6 shadow-2xl shadow-blue-500/30">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mb-2">
            <h1 className="text-2xl sm:text-4xl font-black text-white">📊 ADMIN - SEMUA ORDERS</h1>
            <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">ADMIN ONLY</span>
          </div>
          <p className="text-blue-100 text-xs sm:text-sm">Kelola semua pesanan</p>
        </div>

        {/* Stats & Controls */}
        <div className="bg-gray-900 border-2 border-blue-500/50 p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <div className="bg-blue-900/50 border border-blue-500/30 rounded-lg px-3 sm:px-4 py-2">
                <span className="text-xl sm:text-2xl font-black text-blue-400">{orders.length}</span>
                <span className="text-xs sm:text-sm text-gray-400 ml-2">Total Orders</span>
              </div>
              {selectedOrders.size > 0 && (
                <div className="bg-orange-900/50 border border-orange-500/30 rounded-lg px-3 sm:px-4 py-2">
                  <span className="text-xl sm:text-2xl font-black text-orange-400">{selectedOrders.size}</span>
                  <span className="text-xs sm:text-sm text-gray-400 ml-2">Dipilih</span>
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-wrap w-full sm:w-auto">
              {selectedOrders.size > 0 && (
                <button onClick={handleDeleteSelected} disabled={deleting} className="flex-1 sm:flex-none bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-2 px-3 sm:px-4 rounded-lg transition disabled:shadow-none text-xs sm:text-base">
                  {deleting ? '⏳ Menghapus...' : `🗑️ Hapus (${selectedOrders.size})`}
                </button>
              )}
              <a href="/admin" className="flex-1 sm:flex-none text-center bg-gray-800 hover:bg-gray-700 border-2 border-purple-500/50 text-purple-500 font-bold py-2 px-3 sm:px-4 rounded-lg transition text-xs sm:text-base">🔐 Verifikasi</a>
              <a href="/orders" className="flex-1 sm:flex-none text-center bg-gray-800 hover:bg-gray-700 border-2 border-blue-500/50 text-blue-500 font-bold py-2 px-3 sm:px-4 rounded-lg transition text-xs sm:text-base">📋 Public Orders</a>
              <button onClick={handleLogout} className="flex-1 sm:flex-none text-center bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold py-2 px-3 sm:px-4 rounded-lg transition text-xs sm:text-base">🚪 Logout</button>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Cari ID atau nomor telepon..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            >
              <option value="all">Semua Status</option>
              <option value="pending">Semua Pending</option>
              <option value="pending_pembayaran">Menunggu Pembayaran</option>
              <option value="pending_konfirmasi_admin">Menunggu Verifikasi</option>
              <option value="berhasil">Berhasil</option>
              <option value="gagal">Gagal</option>
              <option value="expired">Expired</option>
            </select>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>Menampilkan: {paginatedOrders.length} dari {filteredOrders.length} orders (Total: {orders.length})</span>
            </div>
            {/* Rows Per Page */}
            <div>
              <label className="block text-xs text-gray-400 mb-2">📊 Baris per Halaman</label>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              >
                <option value={10}>10 baris</option>
                <option value={15}>15 baris</option>
                <option value={25}>25 baris</option>
                <option value={50}>50 baris</option>
                <option value={100}>100 baris</option>
              </select>
            </div>
          </div>

          {/* Status Legend */}
          <div className="pt-4 border-t border-gray-800">
            <p className="text-xs text-gray-400 mb-2 font-bold">📋 Keterangan Status:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
              <div className="flex items-start gap-2">
                <span className="text-yellow-400 font-bold">⏳ Pending</span>
                <span className="text-gray-500">- Menunggu pembayaran</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-400 font-bold">✅ Berhasil</span>
                <span className="text-gray-500">- Bug terkirim ke nomor tujuan</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-400 font-bold">❌ Gagal</span>
                <span className="text-gray-500">- Ditolak oleh admin</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-orange-400 font-bold">⏰ Expired</span>
                <span className="text-gray-500">- Expired/gagal (waktu habis)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="bg-gray-900 border-2 border-blue-500/50 rounded-b-2xl p-6 shadow-2xl shadow-blue-500/20">
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto"></div>
              <p className="mt-6 text-gray-400 text-lg">Memuat data...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-7xl mb-4">📭</div>
              <p className="text-gray-400 text-xl font-bold mb-2">Tidak ada orders</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Select All */}
              <div className="bg-gray-800 rounded-lg p-3 border border-blue-500/30 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={selectedOrders.size === paginatedOrders.length && paginatedOrders.length > 0} 
                    onChange={toggleSelectAll} 
                    className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500 focus:ring-2 cursor-pointer" 
                  />
                  <span className="text-sm text-gray-400 font-bold">
                    {selectedOrders.size === paginatedOrders.length && paginatedOrders.length > 0 ? 'Batal Pilih Semua' : 'Pilih Semua'} ({paginatedOrders.length})
                  </span>
                </label>
                {selectedOrders.size > 0 && (
                  <span className="text-sm text-orange-400 font-bold">{selectedOrders.size} dipilih</span>
                )}
              </div>

              {paginatedOrders.map((order) => {
                const product = order.product_id ? productMap[order.product_id] : null;
                const isSelected = selectedOrders.has(order.id);
                const displayStatus = normalizeOrderStatus(order.status);

                return (
                  <div key={order.id} className={`bg-gray-800 border-2 rounded-xl p-4 sm:p-5 transition-all ${isSelected ? 'border-orange-500 shadow-lg shadow-orange-500/20' : 'border-blue-500/30 hover:border-blue-500/70'}`}>
                    <div className="flex items-start gap-2 sm:gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOrder(order.id)}
                        className="w-5 h-5 mt-1 rounded border-gray-600 bg-gray-800 text-orange-600 focus:ring-orange-500 focus:ring-2 cursor-pointer flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className="font-mono text-xs text-blue-400 bg-gray-900 px-2 sm:px-3 py-1.5 rounded-lg border border-blue-500/30 font-bold truncate">{order.custom_id || order.id}</span>
                          <span className="text-xs text-gray-500">{formatJakartaDateTime(order.created_at)}</span>
                          <span className={`px-2 py-1 rounded text-xs font-bold border ${statusColors[displayStatus] || 'bg-gray-800 border-gray-600 text-gray-400'}`}
                            title={
                              displayStatus === 'pending_pembayaran' ? 'Menunggu pembayaran' :
                              displayStatus === 'pending_konfirmasi_admin' ? 'Menunggu verifikasi admin' :
                              displayStatus === 'berhasil' ? 'Bug berhasil terkirim ke nomor tujuan' :
                              displayStatus === 'gagal' ? 'Pembayaran ditolak oleh admin' :
                              displayStatus === 'expired' ? 'Pembayaran expired/gagal - waktu habis atau masalah lain' :
                              ''
                            }
                          >
                            {displayStatus === 'pending_pembayaran' && '⏳ Menunggu Pembayaran'}
                            {displayStatus === 'pending_konfirmasi_admin' && '📋 Menunggu Verifikasi Admin'}
                            {displayStatus === 'berhasil' && '✅ Bug Terkirim'}
                            {displayStatus === 'gagal' && '❌ Ditolak Admin'}
                            {displayStatus === 'expired' && '⏰ Expired/Gagal'}
                          </span>
                        </div>

                        {product && (
                          <div className="flex items-center gap-2 sm:gap-3 mb-3 p-2 sm:p-3 bg-gray-900 rounded-lg border border-blue-500/20">
                            <img src={product.image} alt={product.name} className="w-8 h-8 sm:w-10 sm:h-10 object-contain flex-shrink-0" />
                            <div><p className="text-xs sm:text-sm font-bold text-gray-300">{product.name}</p></div>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                          <p className="text-gray-300 text-xs sm:text-sm">📱 <span className="font-mono text-orange-400">{order.phone_number}</span></p>
                          {order.payment_amount && <p className="text-white font-bold text-xs sm:text-sm">💰 Rp {order.payment_amount.toLocaleString('id-ID')}</p>}
                          {order.payment_proof_url && <span className="text-xs text-purple-400">📸 Ada Bukti</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-400">
                    Halaman {currentPage} dari {totalPages}
                  </div>
                  <div className="flex gap-2 flex-wrap justify-center">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition text-sm font-bold border border-blue-500/30"
                    >
                      ← Prev
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) pageNum = i + 1;
                      else if (currentPage <= 3) pageNum = i + 1;
                      else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = currentPage - 2 + i;

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-2 rounded-lg transition text-sm font-bold border ${
                            currentPage === pageNum
                              ? 'bg-blue-600 border-blue-500 text-white'
                              : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition text-sm font-bold border border-blue-500/30"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
