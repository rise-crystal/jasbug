'use client';

import { useEffect, useState, useMemo } from 'react';
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

const normalizeOrderStatus = (status: string) => status === 'pending' ? 'pending_pembayaran' : status;
const isPendingStatus = (status: string) => ['pending', 'pending_pembayaran', 'pending_konfirmasi_admin'].includes(status);
const matchesStatusFilter = (status: string, filterStatus: string) => {
  if (filterStatus === 'all') return true;
  if (filterStatus === 'pending') return isPendingStatus(status);

  return normalizeOrderStatus(status) === filterStatus;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    let isActive = true;

    const fetchOrders = async (showLoader = false) => {
      if (showLoader && isActive) {
        setLoading(true);
      }

      try {
        const response = await fetch(`/api/orders/public?sort=${sortBy}`, {
          cache: 'no-store',
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Gagal mengambil daftar order');
        }

        if (isActive) {
          setOrders(Array.isArray(result.orders) ? result.orders : []);
        }
      } catch (error) {
        console.error('Public orders fetch error:', error);

        if (showLoader && isActive) {
          setOrders([]);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void fetchOrders(true);

    // NOTE: Realtime WebSocket is blocked by CSP, so we use polling only
    // Polling setiap 10 detik untuk memastikan data selalu terupdate
    const pollingInterval = setInterval(() => {
      console.log('📡 Polling: Refetching orders to ensure data is up-to-date...');
      void fetchOrders();
    }, 10000); // 10 seconds

    return () => {
      isActive = false;
      clearInterval(pollingInterval);
      console.log('Cleanup orders polling');
    };
  }, [sortBy]);

  // Filter & Search
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Filter by status
    if (filterStatus !== 'all') {
      result = result.filter(order => matchesStatusFilter(order.status, filterStatus));
    }

    // Search by custom_id or phone_number
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(order => 
        order.custom_id?.toLowerCase().includes(query) ||
        order.phone_number?.toLowerCase().includes(query) ||
        order.id?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [orders, filterStatus, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / rowsPerPage);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredOrders.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredOrders, currentPage, rowsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchQuery, rowsPerPage]);

  // Stats
  const stats = useMemo(() => ({
    total: orders.length,
    pending_pembayaran: orders.filter(o => normalizeOrderStatus(o.status) === 'pending_pembayaran').length,
    pending_konfirmasi_admin: orders.filter(o => normalizeOrderStatus(o.status) === 'pending_konfirmasi_admin').length,
    berhasil: orders.filter(o => normalizeOrderStatus(o.status) === 'berhasil').length,
    gagal: orders.filter(o => normalizeOrderStatus(o.status) === 'gagal').length,
    expired: orders.filter(o => normalizeOrderStatus(o.status) === 'expired').length,
  }), [orders]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,0,0,0.05)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        <div className="relative z-10 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Memuat data pesanan...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 relative overflow-hidden py-4 sm:py-8 px-3 sm:px-4">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,0,0,0.05)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-center py-3 sm:py-4 px-4 sm:px-6 rounded-t-2xl mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            📊 PUBLIC ORDERS
          </h1>
          <p className="text-blue-100 text-xs sm:text-sm mt-1">Daftar semua pesanan publik</p>
        </div>

        {/* Stats Cards */}
        <div className="bg-gray-900 border-2 border-blue-500/50 p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3">
            <div className="bg-gray-800 rounded-lg p-2 sm:p-3 border border-blue-500/30 text-center">
              <div className="text-xl sm:text-2xl font-black text-blue-400">{stats.total}</div>
              <div className="text-xs text-gray-400">Total Orders</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-2 sm:p-3 border border-yellow-500/30 text-center">
              <div className="text-xl sm:text-2xl font-black text-yellow-400">{stats.pending_pembayaran}</div>
              <div className="text-xs text-gray-400">Menunggu Bayar</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-2 sm:p-3 border border-orange-500/30 text-center">
              <div className="text-xl sm:text-2xl font-black text-orange-400">{stats.pending_konfirmasi_admin}</div>
              <div className="text-xs text-gray-400">Menunggu Verifikasi</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-2 sm:p-3 border border-green-500/30 text-center">
              <div className="text-xl sm:text-2xl font-black text-green-400">{stats.berhasil}</div>
              <div className="text-xs text-gray-400">Bug Terkirim ✓</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-2 sm:p-3 border border-red-500/30 text-center">
              <div className="text-xl sm:text-2xl font-black text-red-400">{stats.gagal}</div>
              <div className="text-xs text-gray-400">Ditolak Admin</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-2 sm:p-3 border border-orange-500/30 text-center col-span-2 md:col-span-1">
              <div className="text-xl sm:text-2xl font-black text-orange-400">{stats.expired}</div>
              <div className="text-xs text-gray-400">Expired/Gagal</div>
            </div>
          </div>

          {/* Status Legend */}
          <div className="mt-4 pt-4 border-t border-gray-800">
            <p className="text-xs text-gray-400 mb-2 font-bold">📋 Keterangan Status:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-start gap-2">
                <span className="text-yellow-400 font-bold">⏳ Pending</span>
                <span className="text-gray-500">- Menunggu pembayaran dari customer</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-400 font-bold">✅ Berhasil</span>
                <span className="text-gray-500">- Bug berhasil terkirim ke nomor tujuan</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-400 font-bold">❌ Gagal</span>
                <span className="text-gray-500">- Pembayaran ditolak oleh admin</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-orange-400 font-bold">⏰ Expired</span>
                <span className="text-gray-500">- Pembayaran expired/gagal (waktu habis atau masalah lain)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-gray-900 border-2 border-blue-500/50 p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {/* Search */}
            <div>
              <label className="block text-xs text-gray-400 mb-2">🔍 Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari ID atau nomor telepon..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              />
            </div>

            {/* Filter Status */}
            <div>
              <label className="block text-xs text-gray-400 mb-2">📋 Filter Status</label>
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
            </div>

            {/* Sort */}
            <div>
              <label className="block text-xs text-gray-400 mb-2">📅 Urutkan</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              >
                <option value="newest">Terbaru Dulu</option>
                <option value="oldest">Terlama Dulu</option>
              </select>
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
                <option value={5}>5 baris</option>
                <option value={10}>10 baris</option>
                <option value={25}>25 baris</option>
                <option value={50}>50 baris</option>
                <option value={100}>100 baris</option>
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-3 text-xs text-gray-500">
            Menampilkan {paginatedOrders.length} dari {filteredOrders.length} orders
          </div>
        </div>

        {/* Orders List */}
        <div className="bg-gray-900 border-2 border-blue-500/50 rounded-b-2xl p-6">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-500 text-lg">
                {searchQuery || filterStatus !== 'all'
                  ? 'Tidak ada orders yang sesuai filter'
                  : 'Belum ada pesanan'}
              </p>
              {(searchQuery || filterStatus !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterStatus('all');
                  }}
                  className="mt-4 text-blue-400 hover:text-blue-300 text-sm font-bold"
                >
                  Reset Filter
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {paginatedOrders.map((order) => {
                  const product = order.product_id ? productMap[order.product_id] : null;
                  const displayStatus = normalizeOrderStatus(order.status);
                  const statusStyles = {
                    pending: 'bg-yellow-900/50 border-yellow-500/50 text-yellow-400',
                    pending_pembayaran: 'bg-yellow-900/50 border-yellow-500/50 text-yellow-400',
                    pending_konfirmasi_admin: 'bg-orange-900/50 border-orange-500/50 text-orange-400',
                    berhasil: 'bg-green-900/50 border-green-500/50 text-green-400',
                    gagal: 'bg-red-900/50 border-red-500/50 text-red-400',
                    expired: 'bg-orange-900/50 border-orange-500/50 text-orange-400',
                  };

                  return (
                    <div
                      key={order.id}
                      className="bg-gray-800 border-2 border-blue-500/30 hover:border-blue-500/70 rounded-lg p-3 sm:p-4 transition-all"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="font-mono text-xs text-orange-400 bg-gray-900 px-2 py-1 rounded border border-orange-500/30 font-bold truncate">
                            {order.custom_id || order.id}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatJakartaDateTime(order.created_at)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                          {product && (
                            <div className="flex items-center gap-2">
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-8 h-8 object-contain flex-shrink-0"
                              />
                              <span className="text-xs sm:text-sm text-gray-300 font-medium truncate">
                                {product.name}
                              </span>
                            </div>
                          )}
                          <p className="text-gray-400 text-xs sm:text-sm">
                            📱 <span className="font-mono">{order.phone_number}</span>
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          {order.payment_amount && (
                            <span className="text-orange-400 font-bold text-xs sm:text-sm">
                              Rp {order.payment_amount.toLocaleString('id-ID')}
                            </span>
                          )}
                          <span
                            className={`px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-bold border ${
                              statusStyles[displayStatus as keyof typeof statusStyles] || 'bg-gray-800 border-gray-600 text-gray-400'
                            }`}
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
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-500">
                    Halaman {currentPage} dari {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition text-sm font-bold"
                    >
                      ← Prev
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-2 rounded-lg transition text-sm font-bold ${
                            currentPage === pageNum
                              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
                              : 'bg-gray-800 hover:bg-gray-700 text-gray-400'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition text-sm font-bold"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Links */}
        <div className="mt-6 flex justify-center">
          <a
            href="/"
            className="bg-gray-800 hover:bg-gray-700 border-2 border-orange-500/50 text-orange-500 font-bold py-2 px-4 rounded-lg transition"
          >
            ← Kembali ke Home
          </a>
        </div>
      </div>
    </main>
  );
}
