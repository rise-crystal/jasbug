'use client';

import { useEffect, useState, useMemo } from 'react';
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
  created_at: string;
}

const productMap: Record<string, { name: string; image: string }> = {
  'computer-bug': { name: 'Power Bug 🔥', image: 'https://media.tenor.com/1B8g80k8vC4AAAAi/gf.gif' },
};

const supabase = getSupabase();

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const itemsPerPage = 10;

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
        .order('created_at', { ascending: sortBy === 'oldest' });

      if (data) {
        setOrders(data);
      }
      setLoading(false);
    };

    fetchOrders();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sortBy]);

  // Filter & Search
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Filter by status
    if (filterStatus !== 'all') {
      result = result.filter(order => order.status === filterStatus);
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
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredOrders, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchQuery]);

  // Stats
  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    berhasil: orders.filter(o => o.status === 'berhasil').length,
    gagal: orders.filter(o => o.status === 'gagal').length,
  }), [orders]);

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
    <main className="min-h-screen bg-gray-950 relative overflow-hidden py-8 px-4">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,0,0,0.05)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-center py-4 px-6 rounded-t-2xl mb-6">
          <h1 className="text-3xl font-black text-white">
            📊 PUBLIC ORDERS
          </h1>
          <p className="text-blue-100 text-sm mt-1">Daftar semua pesanan publik</p>
        </div>

        {/* Stats Cards */}
        <div className="bg-gray-900 border-2 border-blue-500/50 p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gray-800 rounded-lg p-3 border border-blue-500/30 text-center">
              <div className="text-2xl font-black text-blue-400">{stats.total}</div>
              <div className="text-xs text-gray-400">Total Orders</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 border border-yellow-500/30 text-center">
              <div className="text-2xl font-black text-yellow-400">{stats.pending}</div>
              <div className="text-xs text-gray-400">Pending</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 border border-green-500/30 text-center">
              <div className="text-2xl font-black text-green-400">{stats.berhasil}</div>
              <div className="text-xs text-gray-400">Berhasil</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 border border-red-500/30 text-center">
              <div className="text-2xl font-black text-red-400">{stats.gagal}</div>
              <div className="text-xs text-gray-400">Gagal</div>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-gray-900 border-2 border-blue-500/50 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <option value="pending">Pending</option>
                <option value="berhasil">Berhasil</option>
                <option value="gagal">Gagal</option>
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
              {/* Select All Bar */}
              <div className="bg-gray-800 rounded-lg p-3 border border-blue-500/30 flex items-center justify-between mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedOrders.size === paginatedOrders.length && paginatedOrders.length > 0}
                    onChange={toggleSelectAll}
                    className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500 focus:ring-2 cursor-pointer"
                  />
                  <span className="text-sm text-gray-400 font-bold">
                    {selectedOrders.size === paginatedOrders.length && paginatedOrders.length > 0
                      ? `☑️ Batal Pilih Semua (${selectedOrders.size})`
                      : `☐ Pilih Semua (${paginatedOrders.length})`}
                  </span>
                </label>
                {selectedOrders.size > 0 && (
                  <div className="text-sm text-orange-400 font-bold">
                    {selectedOrders.size} orders dipilih
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {paginatedOrders.map((order) => {
                  const product = order.product_id ? productMap[order.product_id] : null;
                  const statusStyles = {
                    pending: 'bg-yellow-900/50 border-yellow-500/50 text-yellow-400',
                    berhasil: 'bg-green-900/50 border-green-500/50 text-green-400',
                    gagal: 'bg-red-900/50 border-red-500/50 text-red-400',
                  };
                  const isSelected = selectedOrders.has(order.id);

                  return (
                    <div
                      key={order.id}
                      className={`bg-gray-800 border-2 rounded-lg p-4 transition-all ${
                        isSelected
                          ? 'border-orange-500 shadow-lg shadow-orange-500/20'
                          : 'border-blue-500/30 hover:border-blue-500/70'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOrder(order.id)}
                          className="w-5 h-5 mt-1 rounded border-gray-600 bg-gray-800 text-orange-600 focus:ring-orange-500 focus:ring-2 cursor-pointer flex-shrink-0"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-mono text-xs text-orange-400 bg-gray-900 px-2 py-1 rounded border border-orange-500/30 font-bold">
                              {order.custom_id || order.id}
                            </span>
                            <span className="text-xs text-gray-600">|</span>
                            <span className="text-xs text-gray-500">
                              {new Date(order.created_at).toLocaleString('id-ID')}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            {product && (
                              <div className="flex items-center gap-2">
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  className="w-8 h-8 object-contain"
                                />
                                <span className="text-sm text-gray-300 font-medium">
                                  {product.name}
                                </span>
                              </div>
                            )}
                          </div>

                          <p className="text-gray-400 text-sm mt-1">
                            📱 <span className="font-mono">{order.phone_number}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          {order.payment_amount && (
                            <span className="text-orange-400 font-bold text-sm">
                              Rp {order.payment_amount.toLocaleString('id-ID')}
                            </span>
                          )}
                          <span
                            className={`px-3 py-1 rounded-lg text-sm font-bold border ${
                              statusStyles[order.status as keyof typeof statusStyles] || 'bg-gray-800 border-gray-600 text-gray-400'
                            }`}
                          >
                            {order.status === 'pending' && '⏳ '}
                            {order.status === 'berhasil' && '✅ '}
                            {order.status === 'gagal' && '❌ '}
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
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
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <a
            href="/"
            className="bg-gray-800 hover:bg-gray-700 border-2 border-orange-500/50 text-orange-500 font-bold py-2 px-4 rounded-lg transition"
          >
            ← Kembali ke Home
          </a>
          <a
            href="/payment"
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-2 px-4 rounded-lg transition"
          >
            💳 Pembayaran
          </a>
        </div>
      </div>
    </main>
  );
}
