'use client';

import { useState, useEffect } from "react";
import { SidebarWithDateAndWatchlists, mockWatchlists } from "../components/sidebar-with-date-watchlists";

export default function Home() {
  const [selectedWatchlistId, setSelectedWatchlistId] = useState(mockWatchlists[0].id);
  const selectedWatchlist = mockWatchlists.find(w => w.id === selectedWatchlistId);
  const [swingCrossData, setSwingCrossData] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState<string>("");

  // Placeholder data for watchlist components
  const watchlistComponents = selectedWatchlistId === '1'
    ? ['AAPL', 'GOOGL', 'MSFT']
    : selectedWatchlistId === '2'
    ? ['BTC', 'ETH', 'SOL']
    : selectedWatchlistId === '3'
    ? ['VOO', 'VTI', 'ARKK']
    : selectedWatchlistId === '5' && swingCrossData
    ? swingCrossData
    : ['Custom 1', 'Custom 2'];

  useEffect(() => {
    // On mount, fetch the max date from the API and set it as the date
    fetch('http://127.0.0.1:8080/swing-high-cross')
      .then(res => res.json())
      .then(data => {
        // Assume the API returns an array of objects with a date property, or an array of dates
        let maxDate = "";
        if (Array.isArray(data) && data.length > 0) {
          // Try to find the max date from the data
          // If data is array of objects with date property
          if (typeof data[0] === 'object' && data[0] !== null && 'date' in data[0]) {
            maxDate = data.map((d: { date: string }) => d.date).sort().reverse()[0];
          } else if (typeof data[0] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data[0])) {
            // If data is array of date strings
            maxDate = data.sort().reverse()[0];
          }
        }
        if (maxDate) setDate(maxDate);
      });
  }, []);

  useEffect(() => {
    if (selectedWatchlist?.name === 'swing cross up' && date) {
      setLoading(true);
      setError(null);
      fetch(`http://127.0.0.1:8080/swing-high-cross?date=${date}&direction=up`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch');
          return res.json();
        })
        .then(data => {
          setSwingCrossData(Array.isArray(data) ? data : []);
        })
        .catch(e => setError(e.message))
        .finally(() => setLoading(false));
    } else {
      setSwingCrossData(null);
    }
  }, [selectedWatchlistId, selectedWatchlist, date]);

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <SidebarWithDateAndWatchlists
          selectedWatchlistId={selectedWatchlistId}
          onSelectWatchlist={setSelectedWatchlistId}
          date={date}
          setDate={setDate}
        />
      </aside>
      <main className="flex-1 flex">
        <div className="flex-1 flex">
          {/* Candlestick chart placeholder */}
          <div className="flex-1 h-[400px] bg-zinc-100 dark:bg-zinc-800 rounded-lg m-8 flex items-center justify-center text-zinc-400">
            Candlestick Chart
          </div>
        </div>
        <div className="w-72 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex flex-col gap-4 h-screen overflow-y-auto">
          <h2 className="text-lg font-semibold mb-2">{selectedWatchlist?.name} Components</h2>
          {loading && <div>Loading...</div>}
          {error && <div className="text-red-500">{error}</div>}
          <ul className="flex flex-col gap-2">
            {watchlistComponents.map((item, idx) => {
              const symbol = typeof item === 'string'
                ? item
                : (item && typeof item === 'object' && ('symbol' in item || 'ticker' in item || 'name' in item))
                  ? (item as { symbol?: string; ticker?: string; name?: string }).symbol || 
                    (item as { symbol?: string; ticker?: string; name?: string }).ticker || 
                    (item as { symbol?: string; ticker?: string; name?: string }).name
                  : JSON.stringify(item);
              return (
                <li key={(symbol || 'unknown') + idx} className="rounded px-3 py-2 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white">
                  {symbol || 'Unknown'}
                </li>
              );
            })}
          </ul>
        </div>
      </main>
    </div>
  );
}
