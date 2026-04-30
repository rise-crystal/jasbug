'use client';

import { useEffect, useState } from 'react';

type TimePayload = {
  success: boolean;
  serverNowMs: number;
  timeZone: string;
  location: string;
};

const formatDate = (ms: number, timeZone: string) =>
  new Intl.DateTimeFormat('id-ID', {
    timeZone,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(ms);

const formatTime = (ms: number, timeZone: string) =>
  new Intl.DateTimeFormat('id-ID', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(ms);

export function JakartaTimeWidget() {
  const [serverNowMs, setServerNowMs] = useState<number | null>(null);
  const [timeZone, setTimeZone] = useState('Asia/Jakarta');
  const [location, setLocation] = useState('Jakarta, Indonesia');

  useEffect(() => {
    let mounted = true;

    const syncTime = async () => {
      try {
        const response = await fetch('/api/time/current', {
          cache: 'no-store',
        });
        const data = (await response.json()) as Partial<TimePayload>;

        if (!mounted || !response.ok || typeof data.serverNowMs !== 'number') {
          return;
        }

        setServerNowMs(data.serverNowMs);
        setTimeZone(data.timeZone || 'Asia/Jakarta');
        setLocation(data.location || 'Jakarta, Indonesia');
      } catch (error) {
        console.error('Time widget sync failed:', error);
      }
    };

    syncTime();

    const serverSync = setInterval(syncTime, 30000);
    const localTick = setInterval(() => {
      setServerNowMs(prev => (typeof prev === 'number' ? prev + 1000 : prev));
    }, 1000);

    return () => {
      mounted = false;
      clearInterval(serverSync);
      clearInterval(localTick);
    };
  }, []);

  return (
    <div className="fixed top-3 left-1/2 z-[100] -translate-x-1/2 pointer-events-none">
      <div className="rounded-2xl border border-cyan-400/30 bg-gray-950/85 px-4 py-2 shadow-2xl shadow-cyan-500/10 backdrop-blur-md">
        <p className="text-center font-mono text-sm font-black tracking-[0.18em] text-white sm:text-base">
          {serverNowMs ? formatTime(serverNowMs, timeZone) : '00:00:00'}{' '}
          <span className="text-cyan-300">Asia/Jakarta</span>
        </p>
        <p className="mt-1 text-center text-[11px] text-gray-300 sm:text-xs">
          {serverNowMs ? formatDate(serverNowMs, timeZone) : 'Memuat waktu...'}
        </p>
        <p className="text-center text-[10px] uppercase tracking-[0.16em] text-cyan-200/90 sm:text-[11px]">
          {location}
        </p>
      </div>
    </div>
  );
}
