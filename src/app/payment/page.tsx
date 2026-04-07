'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';

interface Order {
  id: string;
  custom_id: string;
  phone_number: string;
  status: string;
  product_id: string | null;
  dana_transaction_id: string | null;
  qris_string: string | null;
  payment_amount: number | null;
  payment_proof_url: string | null;
  payment_proof_verified: boolean | null;
  payment_proof_verified_at: string | null;
  bug_delivery_status: string | null;
  bug_sent_at: string | null;
  created_at: string;
}

const productMap: Record<string, { name: string; image: string; price: number }> = {
  'computer-bug': { name: 'Power Bug 🔥', image: 'https://media.tenor.com/1B8g80k8vC4AAAAi/gf.gif', price: 10000 },
};

const supabase = getSupabase();

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderParam = searchParams.get('order');
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingQR, setGeneratingQR] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [uploadingProof, setUploadingProof] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);

  // Check if order is expired (5 minutes timeout)
  useEffect(() => {
    if (!selectedOrder || !selectedOrder.created_at) return;
    if (selectedOrder.status !== 'pending') return; // Hanya check jika status masih pending

    let hasUpdated = false; // Flag untuk mencegah multiple updates

    const checkExpiry = async () => {
      const createdAt = new Date(selectedOrder.created_at).getTime();
      const now = Date.now();
      const elapsed = now - createdAt;
      const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
      const remaining = fiveMinutes - elapsed;

      if (remaining <= 0 && !hasUpdated) {
        // Jika sudah upload bukti, jangan auto-gagal
        if (!selectedOrder.payment_proof_url && selectedOrder.status === 'pending') {
          hasUpdated = true; // Set flag agar tidak update berkali-kali
          setIsExpired(true);
          setTimeLeft(0);

          console.log('⏰ Order expired! Updating database to status: expired');
          console.log('Order ID:', selectedOrder.id);
          console.log('Order Custom ID:', selectedOrder.custom_id);
          console.log('Created at:', selectedOrder.created_at);
          console.log('Elapsed time:', Math.floor(elapsed / 1000), 'seconds');

          // METHOD 1: Direct Supabase update (lebih reliable)
          try {
            console.log('📝 METHOD 1: Direct Supabase update...');
            
            const { data, error } = await supabase
              .from('orders')
              .update({ 
                status: 'expired',
                updated_at: new Date().toISOString()
              })
              .eq('id', selectedOrder.id);

            if (error) {
              console.error('❌ Direct Supabase error:', error);
              console.log('🔄 Falling back to API method...');
              
              // METHOD 2: API call sebagai fallback
              const response = await fetch(`/api/payment/status/${selectedOrder.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'expired' }),
              });

              const result = await response.json();

              if (!response.ok) {
                throw new Error(result.error || 'API update failed');
              }

              console.log('✅ SUCCESS via API method');
            } else {
              console.log('✅ SUCCESS via Direct Supabase:', data);
            }
              
            // Update states setelah berhasil
            setSelectedOrder(prev => prev ? { ...prev, status: 'expired' } : null);
            setOrders(prev => prev.map(o => 
              o.id === selectedOrder.id ? { ...o, status: 'expired' } : o
            ));
            
            console.log('✅ Database and UI updated to expired');
            
          } catch (error) {
            console.error('❌ FAILED: All methods failed:', error);
            hasUpdated = false; // Reset flag agar bisa retry
          }
        } else if (selectedOrder.payment_proof_url) {
          // Sudah upload bukti, stop timer tapi jangan auto-gagal
          console.log('✅ Payment proof uploaded, stopping timer');
          setIsExpired(false);
          setTimeLeft(0);
        }
      } else if (remaining > 0) {
        setTimeLeft(Math.floor(remaining / 1000)); // seconds
        if (Math.floor(remaining / 1000) % 60 === 0) { // Log setiap menit
          console.log('⏳ Time remaining:', Math.floor(remaining / 1000), 'seconds');
        }
      }
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 1000); // Check every second

    return () => {
      clearInterval(interval);
      console.log('Cleanup expiry check interval');
    };
  }, [selectedOrder]);

  const updateOrderStatus = async (orderId: string, status: 'pending' | 'berhasil' | 'gagal' | 'expired') => {
    try {
      const response = await fetch(`/api/payment/status/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        console.log(`Order status updated to: ${status}`);
      }
    } catch (error) {
      console.error('Update status error:', error);
    }
  };

  useEffect(() => {
    if (!supabase) {
      console.error('Supabase client not initialized');
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      if (!orderParam) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .or(`id.eq.${orderParam},custom_id.eq.${orderParam}`)
        .single();

      if (data && data.status === 'pending') {
        setOrders([data]);
        handleOrderClick(data);
      }
      setLoading(false);
    };

    fetchOrder();

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
          if (orderParam) {
            fetchOrder();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval, orderParam]);

  const handleGenerateQR = async (orderId: string) => {
    setGeneratingQR(orderId);
    try {
      console.log('Generating QR for order:', orderId);
      
      const response = await fetch('/api/payment/qris', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Gagal generate QRIS');
      }

      console.log('QR Code Data URL:', data.qrCodeDataUrl ? 'Generated' : 'Not generated');
      
      setQrCodeDataUrl(data.qrCodeDataUrl);
      setOrders(prev => prev.map(order =>
        order.id === orderId
          ? { ...order, qris_string: data.qrisString, payment_amount: data.amount }
          : order
      ));

      // Update selected order
      setSelectedOrder(prev => prev && prev.id === orderId ? {
        ...prev,
        qris_string: data.qrisString,
        payment_amount: data.amount
      } : prev);

      startPaymentPolling(orderId);
    } catch (error) {
      console.error('Generate QR error:', error);
      alert('❌ Gagal generate QR Code: ' + (error as Error).message);
    } finally {
      setGeneratingQR(null);
    }
  };

  const startPaymentPolling = (orderId: string) => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/payment/status/${orderId}`);
        const data = await response.json();

        if (data.success && data.order) {
          setOrders(prev => prev.map(order => 
            order.id === orderId ? data.order : order
          ));

          // Stop polling if status is final (not pending)
          if (data.order.status !== 'pending') {
            clearInterval(interval);
            setPollingInterval(null);
            setQrCodeDataUrl(null);
            setSelectedOrder(null);
          }
        }
      } catch (error) {
        console.error('Payment status check error:', error);
      }
    }, 3000);

    setPollingInterval(interval);
  };

  const handleOrderClick = (order: Order) => {
    console.log('Order clicked:', order);
    
    if (order.status === 'pending') {
      setSelectedOrder(order);
      
      if (order.qris_string) {
        console.log('Generating QR from existing qris_string');
        import('@/lib/qris-dinamis').then(({ QRISDinamis }) => {
          const qris = new QRISDinamis(order.qris_string!);
          qris.generateQRCodeDataUrl(300).then(dataUrl => {
            console.log('QR Code generated:', dataUrl ? 'Success' : 'Failed');
            setQrCodeDataUrl(dataUrl);
          }).catch(err => {
            console.error('QR generation error:', err);
          });
        });
      } else {
        console.log('No existing qris_string, waiting for generate');
        setQrCodeDataUrl(null);
      }
    }
  };

  const handleUploadProof = async (orderId: string, file: File) => {
    setUploadingProof(orderId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('orderId', orderId);

      const response = await fetch('/api/payment/upload-proof', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal upload bukti');
      }

      setOrders(prev => prev.map(order =>
        order.id === orderId
          ? { ...order, payment_proof_url: data.proofUrl, status: 'pending' }
          : order
      ));

      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { 
          ...prev, 
          payment_proof_url: data.proofUrl,
          status: 'pending' // Auto reset ke pending untuk verifikasi admin
        } : null);
        
        // Stop timer karena sudah upload bukti
        setIsExpired(false);
        setTimeLeft(0);
      }

      alert('✅ Bukti pembayaran berhasil diupload!\n\n📋 Status: Menunggu verifikasi admin\n⏳ Admin akan memeriksa bukti Anda\n✅ Status akan berubah menjadi "Berhasil" setelah disetujui');
    } catch (error) {
      console.error('Upload proof error:', error);
      alert('❌ Gagal upload: ' + (error as Error).message);
    } finally {
      setUploadingProof(null);
    }
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
          <p className="mt-4 text-gray-400">Memuat data pembayaran...</p>
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

      <div className="relative z-10 max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-center py-4 sm:py-6 px-4 sm:px-6 rounded-t-2xl mb-4 sm:mb-6 shadow-2xl shadow-green-500/30">
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">
            💳 PEMBAYARAN
          </h1>
          <p className="text-green-100 text-xs sm:text-sm">Scan QR atau upload bukti transfer</p>
        </div>

        {/* Payment Card */}
        <div className="bg-gray-900 border-2 border-green-500/50 rounded-b-2xl p-4 sm:p-6 shadow-2xl shadow-green-500/20">
          {loading ? (
            <div className="text-center py-12 sm:py-16">
              <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-4 border-green-500 border-t-transparent mx-auto"></div>
              <p className="mt-4 sm:mt-6 text-gray-400 text-base sm:text-lg">Memuat pembayaran...</p>
            </div>
          ) : !selectedOrder ? (
            <div className="text-center py-12 sm:py-16">
              <div className="text-5xl sm:text-7xl mb-4">💳</div>
              <p className="text-gray-400 text-lg sm:text-xl font-bold mb-2">Order tidak ditemukan</p>
              <p className="text-gray-500 text-xs sm:text-sm mb-6">Buat order baru terlebih dahulu</p>
              <a
                href="/"
                className="inline-block bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold py-2 sm:py-3 px-6 sm:px-8 rounded-lg transition shadow-lg shadow-red-500/30 text-sm sm:text-base"
              >
                🚀 Buat Order
              </a>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {/* Order Info */}
              <div className="bg-gray-800 rounded-xl p-3 sm:p-4 border border-green-500/30">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="font-mono text-xs sm:text-sm text-orange-400 bg-gray-900 px-2 sm:px-3 py-1.5 rounded-lg border border-orange-500/30 font-bold truncate">
                    {selectedOrder.custom_id || selectedOrder.id}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(selectedOrder.created_at).toLocaleString('id-ID')}
                  </span>
                </div>

                {/* Countdown Timer - Hide if already uploaded proof */}
                {selectedOrder.status === 'pending' && !isExpired && !selectedOrder.payment_proof_url && (
                  <div className={`rounded-lg p-3 mb-3 text-center ${
                    timeLeft < 60
                      ? 'bg-red-900/50 border-2 border-red-500 animate-pulse'
                      : timeLeft < 180
                      ? 'bg-yellow-900/50 border-2 border-yellow-500'
                      : 'bg-blue-900/30 border border-blue-500/30'
                  }`}>
                    <p className={`text-xs mb-1 ${
                      timeLeft < 60 ? 'text-red-400' : timeLeft < 180 ? 'text-yellow-400' : 'text-blue-400'
                    }`}>
                      ⏰ Batas waktu pembayaran:
                    </p>
                    <p className={`text-2xl sm:text-3xl font-black ${
                      timeLeft < 60 ? 'text-red-400' : timeLeft < 180 ? 'text-yellow-400' : 'text-blue-400'
                    }`}>
                      {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                    </p>
                    <p className={`text-xs mt-1 ${
                      timeLeft < 60 ? 'text-red-300' : 'text-gray-400'
                    }`}>
                      {timeLeft < 60 ? '⚠️ Segera bayar sebelum expired!' : 'menit:detik'}
                    </p>
                  </div>
                )}

                {isExpired && (
                  <div className="bg-red-900/50 border-2 border-red-500 rounded-lg p-3 mb-3 text-center">
                    <p className="text-red-400 text-xs sm:text-sm font-bold">
                      ❌ Waktu pembayaran sudah habis
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2 sm:gap-3 mb-3 p-2 sm:p-3 bg-gray-900 rounded-lg">
                  <img
                    src="https://media.tenor.com/1B8g80k8vC4AAAAi/gf.gif"
                    alt="Power Bug"
                    className="w-10 h-10 sm:w-12 sm:h-12 object-contain flex-shrink-0"
                  />
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-gray-300">Power Bug 🔥</p>
                    <p className="text-xs text-gray-500">Digital Payload</p>
                  </div>
                </div>

                <p className="text-gray-400 text-xs sm:text-sm mb-2">
                  📱 <span className="font-mono text-orange-400">{selectedOrder.phone_number}</span>
                </p>

                <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-lg p-3 text-center">
                  <p className="text-white/80 text-xs mb-1">Total Pembayaran</p>
                  <p className="text-white font-black text-xl sm:text-2xl">
                    Rp {selectedOrder.payment_amount?.toLocaleString('id-ID') || '10.000'}
                  </p>
                </div>
              </div>

              {/* QR Code Section */}
              {!isExpired && !selectedOrder.payment_proof_url && (
                <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-green-500/30">
                  <h3 className="text-center text-base sm:text-lg font-black text-white mb-4">
                    📱 Scan QR Code
                  </h3>

                  {qrCodeDataUrl ? (
                    <div className="bg-white rounded-xl p-3 sm:p-4 mb-4 shadow-lg">
                      <img src={qrCodeDataUrl} alt="QR Code" className="w-full" />
                    </div>
                  ) : (
                    <div className="bg-gray-900 rounded-xl p-6 sm:p-8 mb-4 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-4xl sm:text-6xl mb-3">⏳</div>
                        <p className="text-gray-500 text-xs sm:text-sm">Generating QR Code...</p>
                      </div>
                    </div>
                  )}

                  <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-3">
                    <p className="text-blue-400 text-xs text-center mb-2">
                      💡 Cara bayar:
                    </p>
                    <ul className="text-blue-300 text-xs space-y-1">
                      <li>1. Buka e-wallet (DANA, GoPay, OVO, dll)</li>
                      <li>2. Pilih "Scan QR" atau "Pay"</li>
                      <li>3. Arahkan kamera ke QR code di atas</li>
                      <li>4. Konfirmasi pembayaran</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Upload Bukti Section */}
              <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-green-500/30">
                <h3 className="text-center text-base sm:text-lg font-black text-white mb-4">
                  📸 Upload Bukti Transfer
                </h3>

                {selectedOrder.payment_proof_url ? (
                  <div className="space-y-4">
                    {/* Bukti Terupload - Hanya Button */}
                    <div className="bg-gray-900 rounded-lg p-4 border border-purple-500/30">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                        <div>
                          <p className="text-sm sm:text-base text-white font-bold">✅ Bukti Pembayaran Terupload</p>
                          <p className="text-xs text-gray-400 mt-1">Klik tombol untuk melihat detail bukti transfer</p>
                        </div>
                        <button
                          onClick={() => setPreviewFile(selectedOrder.payment_proof_url)}
                          className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm font-bold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2"
                        >
                          👁️ Lihat Bukti Pembayaran
                        </button>
                      </div>

                      {/* Status Verifikasi */}
                      {selectedOrder.payment_proof_verified ? (
                        <div className="bg-green-900/50 border border-green-500/50 rounded-lg p-3 flex items-center gap-3">
                          <div className="text-2xl">✅</div>
                          <div>
                            <p className="text-green-400 font-bold text-sm">Pembayaran Terverifikasi!</p>
                            {selectedOrder.payment_proof_verified_at && (
                              <p className="text-green-300 text-xs mt-1">
                                Diverifikasi: {new Date(selectedOrder.payment_proof_verified_at).toLocaleString('id-ID')}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-yellow-900/50 border border-yellow-500/50 rounded-lg p-3 flex items-center gap-3">
                          <div className="text-2xl animate-pulse">⏳</div>
                          <div>
                            <p className="text-yellow-400 font-bold text-sm">Menunggu Verifikasi Admin</p>
                            <p className="text-yellow-300 text-xs mt-1">Admin sedang memeriksa bukti Anda</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Peringatan Penting */}
                    <div className="bg-red-900/50 border-2 border-red-500 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl flex-shrink-0">⚠️</div>
                        <div>
                          <p className="text-red-400 font-bold text-sm mb-2">PENTING - BACA DENGAN SEKSAMA!</p>
                          <ul className="text-red-300 text-xs space-y-2">
                            <li className="flex items-start gap-2">
                              <span className="font-bold">•</span>
                              <span>Anda <strong className="text-white">WAJIB</strong> mengupload bukti pembayaran yang valid (screenshot/struk transfer)</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="font-bold">•</span>
                              <span>Jika <strong className="text-white">TIDAK UPLOAD</strong> atau file yang diupload <strong className="text-white">BUKAN bukti pembayaran</strong>, maka bug <strong className="text-white">TIDAK AKAN DIKIRIM</strong> ke target</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="font-bold">•</span>
                              <span>Admin <strong className="text-white">TIDAK AKAN MEMPROSES</strong> order tanpa bukti pembayaran yang valid</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="font-bold">•</span>
                              <span>Pastikan bukti transfer jelas dan bisa dibaca (tidak blur/terpotong)</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : isExpired ? (
                  <div className="bg-gray-900 rounded-lg p-4 sm:p-6 border border-red-500/50 text-center">
                    <div className="text-3xl sm:text-4xl mb-3">⏰</div>
                    <p className="text-gray-400 font-bold mb-2 text-sm sm:text-base">Waktu pembayaran sudah habis</p>
                    <p className="text-gray-500 text-xs sm:text-sm mb-4">Silakan buat order baru</p>
                    <a
                      href="/"
                      className="inline-block bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold py-2 px-6 rounded-lg transition text-sm sm:text-base"
                    >
                      🚀 Buat Order Baru
                    </a>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Instruksi */}
                    <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
                      <p className="text-blue-300 text-xs sm:text-sm font-bold mb-2">📋 Cara Upload Bukti:</p>
                      <ol className="text-blue-200 text-xs space-y-1 list-decimal list-inside">
                        <li>Klik tombol hijau di bawah ini</li>
                        <li>Pilih file bukti transfer dari device Anda</li>
                        <li>Tunggu proses upload selesai</li>
                        <li>Bukti akan langsung tampil di halaman ini</li>
                      </ol>
                    </div>

                    {/* Upload Button */}
                    <div>
                      <label className="block w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-center font-bold py-4 sm:py-5 px-4 sm:px-6 rounded-lg transition cursor-pointer shadow-lg shadow-green-500/30 hover:shadow-green-500/50 text-sm sm:text-base">
                        {uploadingProof ? (
                          <span className="flex items-center justify-center gap-3">
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>⏳ Mengupload bukti...</span>
                          </span>
                        ) : (
                          <span className="flex flex-col sm:flex-row items-center justify-center gap-2">
                            <span className="text-xl">📸</span>
                            <span>Pilih File Bukti Transfer</span>
                          </span>
                        )}
                        <input
                          type="file"
                          className="hidden"
                          accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 5 * 1024 * 1024) {
                                alert('❌ File terlalu besar! Maksimal 5MB');
                                return;
                              }
                              await handleUploadProof(selectedOrder.id, file);
                            }
                          }}
                        />
                      </label>
                    </div>

                    {/* Format Info */}
                    <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                      <p className="text-center text-xs text-gray-400">
                        📄 Format yang didukung: <span className="text-white font-bold">JPG, PNG, WebP, PDF</span> (Max 5MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Status */}
              {selectedOrder.status !== 'gagal' && selectedOrder.status !== 'expired' && (
                <div className={`rounded-xl p-3 sm:p-4 text-center ${
                  selectedOrder.status === 'berhasil'
                    ? 'bg-green-900/50 border-2 border-green-500'
                    : selectedOrder.payment_proof_url
                    ? 'bg-purple-900/50 border-2 border-purple-500'
                    : 'bg-yellow-900/50 border-2 border-yellow-500'
                }`}>
                  <p className={`text-sm sm:text-lg font-black ${
                    selectedOrder.status === 'berhasil' ? 'text-green-400' :
                    selectedOrder.status === 'expired' ? 'text-red-400' :
                    selectedOrder.status === 'gagal' ? 'text-red-400' :
                    selectedOrder.payment_proof_url ? 'text-purple-400' : 'text-yellow-400'
                  }`}>
                    {selectedOrder.status === 'pending' && !selectedOrder.payment_proof_url && '⏳ Menunggu Pembayaran'}
                    {selectedOrder.status === 'pending' && selectedOrder.payment_proof_url && '📋 Menunggu Verifikasi Admin'}
                    {selectedOrder.status === 'berhasil' && '✅ Pembayaran Berhasil'}
                    {selectedOrder.status === 'expired' && '⏰ Pembayaran Expired'}
                    {selectedOrder.status === 'gagal' && '❌ Pembayaran Ditolak'}
                  </p>
                  {selectedOrder.payment_proof_url && selectedOrder.status === 'pending' && (
                    <p className="text-purple-300 text-xs mt-2">
                      Bukti sudah diupload • Admin sedang memeriksa
                    </p>
                  )}
                  {selectedOrder.status === 'berhasil' && selectedOrder.bug_delivery_status === 'sent' && (
                    <div className="mt-3 pt-3 border-t border-green-500/30">
                      <p className="text-green-300 text-xs sm:text-sm font-bold flex items-center justify-center gap-2">
                        🚀 Bug berhasil dikirim ke target!
                      </p>
                      {selectedOrder.bug_sent_at && (
                        <p className="text-green-400 text-xs mt-1">
                          Dikirim: {new Date(selectedOrder.bug_sent_at).toLocaleString('id-ID')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Expired/Gagal Status */}
              {(selectedOrder.status === 'expired' || selectedOrder.status === 'gagal') && (
                <div className="bg-red-900/50 border-2 border-red-500 rounded-xl p-3 sm:p-4 text-center">
                  <p className="text-red-400 text-sm sm:text-lg font-black">
                    {selectedOrder.status === 'expired' ? '⏰ Pembayaran Expired' : '❌ Pembayaran Ditolak'}
                  </p>
                  <p className="text-red-300 text-xs mt-2">
                    {selectedOrder.status === 'expired' 
                      ? 'Waktu pembayaran sudah habis. Silakan buat order baru.'
                      : 'Pembayaran ditolak oleh admin. Silakan buat order baru.'}
                  </p>
                  <a
                    href="/"
                    className="inline-block mt-4 bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold py-2 px-6 rounded-lg transition text-sm sm:text-base"
                  >
                    🚀 Buat Order Baru
                  </a>
                </div>
              )}

              {/* Back Link */}
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="/"
                  className="flex-1 text-center bg-gray-800 hover:bg-gray-700 border-2 border-orange-500/50 text-orange-500 font-bold py-3 rounded-lg transition text-sm sm:text-base"
                >
                  ← Home
                </a>
                <a
                  href="/orders"
                  className="flex-1 text-center bg-gray-800 hover:bg-gray-700 border-2 border-blue-500/50 text-blue-500 font-bold py-3 rounded-lg transition text-sm sm:text-base"
                >
                  📊 Orders
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-3 sm:p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div className="relative max-w-4xl max-h-full w-full">
            <button
              onClick={() => setPreviewFile(null)}
              className="absolute -top-8 sm:-top-10 right-0 text-white hover:text-gray-300 font-bold text-lg sm:text-xl z-10"
            >
              ✕ Tutup
            </button>

            {previewFile.endsWith('.pdf') ? (
              <div className="bg-white rounded-lg p-3 sm:p-4 max-h-[80vh] overflow-auto">
                <p className="text-gray-700 mb-2 text-sm sm:text-base">📄 PDF Document</p>
                <a href={previewFile} target="_blank" className="text-blue-400 hover:underline text-sm sm:text-base">
                  Buka PDF di tab baru
                </a>
              </div>
            ) : (
              <img
                src={previewFile}
                alt="Bukti Pembayaran"
                className="w-full max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
              />
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-400">Memuat pembayaran...</p>
        </div>
      </div>
    }>
      <PaymentContent />
    </Suspense>
  );
}
