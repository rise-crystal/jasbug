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

    const checkExpiry = () => {
      const createdAt = new Date(selectedOrder.created_at).getTime();
      const now = Date.now();
      const elapsed = now - createdAt;
      const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
      const remaining = fiveMinutes - elapsed;

      if (remaining <= 0) {
        // Jika sudah upload bukti, jangan auto-gagal
        if (!selectedOrder.payment_proof_url && selectedOrder.status === 'pending') {
          setIsExpired(true);
          setTimeLeft(0);
          // Auto-update status to gagal hanya jika belum upload bukti
          updateOrderStatus(selectedOrder.id, 'gagal');
        } else if (selectedOrder.payment_proof_url) {
          // Sudah upload bukti, stop timer tapi jangan auto-gagal
          setIsExpired(false);
          setTimeLeft(0);
        }
      } else {
        setTimeLeft(Math.floor(remaining / 1000)); // seconds
      }
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 1000); // Check every second

    return () => clearInterval(interval);
  }, [selectedOrder]);

  const updateOrderStatus = async (orderId: string, status: 'pending' | 'berhasil' | 'gagal') => {
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
    <main className="min-h-screen bg-gray-950 relative overflow-hidden py-8 px-4">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,0,0,0.05)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-center py-6 px-6 rounded-t-2xl mb-6 shadow-2xl shadow-green-500/30">
          <h1 className="text-4xl font-black text-white mb-2">
            💳 PEMBAYARAN
          </h1>
          <p className="text-green-100 text-sm">Scan QR atau upload bukti transfer</p>
        </div>

        {/* Payment Card */}
        <div className="bg-gray-900 border-2 border-green-500/50 rounded-b-2xl p-6 shadow-2xl shadow-green-500/20">
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-500 border-t-transparent mx-auto"></div>
              <p className="mt-6 text-gray-400 text-lg">Memuat pembayaran...</p>
            </div>
          ) : !selectedOrder ? (
            <div className="text-center py-16">
              <div className="text-7xl mb-4">💳</div>
              <p className="text-gray-400 text-xl font-bold mb-2">Order tidak ditemukan</p>
              <p className="text-gray-500 text-sm mb-6">Buat order baru terlebih dahulu</p>
              <a
                href="/"
                className="inline-block bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold py-3 px-8 rounded-lg transition shadow-lg shadow-red-500/30"
              >
                🚀 Buat Order
              </a>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Order Info */}
              <div className="bg-gray-800 rounded-xl p-4 border border-green-500/30">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-sm text-orange-400 bg-gray-900 px-3 py-1.5 rounded-lg border border-orange-500/30 font-bold">
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
                    <p className={`text-3xl font-black ${
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
                    <p className="text-red-400 text-sm font-bold">
                      ❌ Waktu pembayaran sudah habis
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-3 p-3 bg-gray-900 rounded-lg">
                  <img
                    src="https://media.tenor.com/1B8g80k8vC4AAAAi/gf.gif"
                    alt="Power Bug"
                    className="w-12 h-12 object-contain"
                  />
                  <div>
                    <p className="text-sm font-bold text-gray-300">Power Bug 🔥</p>
                    <p className="text-xs text-gray-500">Digital Payload</p>
                  </div>
                </div>

                <p className="text-gray-400 text-sm mb-2">
                  📱 <span className="font-mono text-orange-400">{selectedOrder.phone_number}</span>
                </p>

                <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-lg p-3 text-center">
                  <p className="text-white/80 text-xs mb-1">Total Pembayaran</p>
                  <p className="text-white font-black text-2xl">
                    Rp {selectedOrder.payment_amount?.toLocaleString('id-ID') || '10.000'}
                  </p>
                </div>
              </div>

              {/* QR Code Section */}
              {!isExpired && !selectedOrder.payment_proof_url && (
                <div className="bg-gray-800 rounded-xl p-6 border border-green-500/30">
                  <h3 className="text-center text-lg font-black text-white mb-4">
                    📱 Scan QR Code
                  </h3>

                  {qrCodeDataUrl ? (
                    <div className="bg-white rounded-xl p-4 mb-4 shadow-lg">
                      <img src={qrCodeDataUrl} alt="QR Code" className="w-full" />
                    </div>
                  ) : (
                    <div className="bg-gray-900 rounded-xl p-8 mb-4 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-6xl mb-3">⏳</div>
                        <p className="text-gray-500 text-sm">Generating QR Code...</p>
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
              <div className="bg-gray-800 rounded-xl p-6 border border-green-500/30">
                <h3 className="text-center text-lg font-black text-white mb-4">
                  📸 Upload Bukti Transfer
                </h3>

                {selectedOrder.payment_proof_url ? (
                  <div className="space-y-3">
                    <div className="bg-gray-900 rounded-lg p-4 border border-purple-500/30">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-400">Bukti Pembayaran</span>
                        <button
                          onClick={() => setPreviewFile(selectedOrder.payment_proof_url)}
                          className="text-purple-400 hover:text-purple-300 text-xs font-bold"
                        >
                          👁️ Lihat
                        </button>
                      </div>
                      {selectedOrder.payment_proof_verified ? (
                        <div className="flex items-center gap-2 text-green-400 text-sm">
                          ✅ <span>Terverifikasi</span>
                          {selectedOrder.payment_proof_verified_at && (
                            <span className="text-gray-500 text-xs">
                              • {new Date(selectedOrder.payment_proof_verified_at).toLocaleString('id-ID')}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-yellow-400 text-sm">
                          ⏳ <span>Menunggu verifikasi admin</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : isExpired ? (
                  <div className="bg-gray-900 rounded-lg p-6 border border-red-500/50 text-center">
                    <div className="text-4xl mb-3">⏰</div>
                    <p className="text-gray-400 font-bold mb-2">Waktu pembayaran sudah habis</p>
                    <p className="text-gray-500 text-sm mb-4">Silakan buat order baru</p>
                    <a
                      href="/"
                      className="inline-block bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold py-2 px-6 rounded-lg transition"
                    >
                      🚀 Buat Order Baru
                    </a>
                  </div>
                ) : (
                  <div>
                    <label className="block w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-center font-bold py-4 px-6 rounded-lg transition cursor-pointer shadow-lg shadow-green-500/30 hover:shadow-green-500/50">
                      {uploadingProof ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Uploading...
                        </span>
                      ) : (
                        '📸 Pilih File Bukti Transfer'
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
                    <p className="text-center text-xs text-gray-500 mt-3">
                      Format: JPG, PNG, WebP, PDF (Max 5MB)
                    </p>
                  </div>
                )}
              </div>

              {/* Status */}
              {selectedOrder.status !== 'gagal' && (
                <div className={`rounded-xl p-4 text-center ${
                  selectedOrder.status === 'berhasil' 
                    ? 'bg-green-900/50 border-2 border-green-500' 
                    : selectedOrder.payment_proof_url
                    ? 'bg-purple-900/50 border-2 border-purple-500'
                    : 'bg-yellow-900/50 border-2 border-yellow-500'
                }`}>
                  <p className={`text-lg font-black ${
                    selectedOrder.status === 'berhasil' ? 'text-green-400' :
                    selectedOrder.payment_proof_url ? 'text-purple-400' : 'text-yellow-400'
                  }`}>
                    {selectedOrder.status === 'pending' && !selectedOrder.payment_proof_url && '⏳ Menunggu Pembayaran'}
                    {selectedOrder.status === 'pending' && selectedOrder.payment_proof_url && '📋 Menunggu Verifikasi Admin'}
                    {selectedOrder.status === 'berhasil' && '✅ Pembayaran Berhasil'}
                  </p>
                  {selectedOrder.payment_proof_url && selectedOrder.status === 'pending' && (
                    <p className="text-purple-300 text-xs mt-2">
                      Bukti sudah diupload • Admin sedang memeriksa
                    </p>
                  )}
                  {selectedOrder.status === 'berhasil' && selectedOrder.bug_delivery_status === 'sent' && (
                    <div className="mt-3 pt-3 border-t border-green-500/30">
                      <p className="text-green-300 text-sm font-bold flex items-center justify-center gap-2">
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

              {/* Back Link */}
              <div className="flex gap-3">
                <a
                  href="/"
                  className="flex-1 text-center bg-gray-800 hover:bg-gray-700 border-2 border-orange-500/50 text-orange-500 font-bold py-3 rounded-lg transition"
                >
                  ← Home
                </a>
                <a
                  href="/orders"
                  className="flex-1 text-center bg-gray-800 hover:bg-gray-700 border-2 border-blue-500/50 text-blue-500 font-bold py-3 rounded-lg transition"
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
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setPreviewFile(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 font-bold text-xl"
            >
              ✕ Tutup
            </button>
            
            {previewFile.endsWith('.pdf') ? (
              <div className="bg-white rounded-lg p-4 max-h-[80vh] overflow-auto">
                <p className="text-gray-700 mb-2">📄 PDF Document</p>
                <a href={previewFile} target="_blank" className="text-blue-400 hover:underline">
                  Buka PDF di tab baru
                </a>
              </div>
            ) : (
              <img
                src={previewFile}
                alt="Bukti Pembayaran"
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
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
