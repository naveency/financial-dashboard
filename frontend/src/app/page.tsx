'use client';

import { useState, useEffect } from "react";
import { SidebarWithDateAndWatchlists, mockWatchlists } from "../components/sidebar-with-date-watchlists";

export default function Home() {
  const [selectedWatchlistId, setSelectedWatchlistId] = useState(mockWatchlists[0].id);
  const selectedWatchlist = mockWatchlists.find(w => w.id === selectedWatchlistId);
  const [watchlistData, setWatchlistData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState<string>("");

  // Get watchlist components from API data
  const watchlistComponents = watchlistData || [];

  useEffect(() => {
    // On mount, fetch the max date from the API and set it as the date
    fetch('http://127.0.0.1:8080/maxdate')
      .then(res => res.json())
      .then(data => {
        if (typeof data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
          setDate(data);
        } else if (data && typeof data === 'object' && 'date' in data) {
          setDate(data.date);
        }
      })
      .catch(e => console.error('Failed to fetch max date:', e));
  }, []);

  useEffect(() => {
    if (!date || !selectedWatchlistId) return;

    setLoading(true);
    setError(null);
    
    let url = '';
    let params = new URLSearchParams({ date });
    
    switch (selectedWatchlistId) {
      case 'new-highs-63':
        url = 'http://127.0.0.1:8080/new-highs';
        params.append('period', '63');
        break;
      case 'new-highs-252':
        url = 'http://127.0.0.1:8080/new-highs';
        params.append('period', '252');
        break;
      case 'new-lows-63':
        url = 'http://127.0.0.1:8080/new-lows';
        params.append('period', '63');
        break;
      case 'new-lows-252':
        url = 'http://127.0.0.1:8080/new-lows';
        params.append('period', '252');
        break;
      case 'gapup':
        url = 'http://127.0.0.1:8080/gapup';
        break;
      case 'gapdown':
        url = 'http://127.0.0.1:8080/gapdown';
        break;
      case 'swing-high-cross-up':
        url = 'http://127.0.0.1:8080/swing-high-cross';
        params.append('direction', 'up');
        break;
      case 'swing-high-cross-down':
        url = 'http://127.0.0.1:8080/swing-high-cross';
        params.append('direction', 'down');
        break;
      case 'swing-low-cross-up':
        url = 'http://127.0.0.1:8080/swing-low-cross';
        params.append('direction', 'up');
        break;
      case 'swing-low-cross-down':
        url = 'http://127.0.0.1:8080/swing-low-cross';
        params.append('direction', 'down');
        break;
      case 'new-signals':
        url = 'http://127.0.0.1:8080/new-signals';
        break;
      case '52-week-rs':
        url = 'http://127.0.0.1:8080/52-week-relative-strength';
        break;
      default:
        setWatchlistData([]);
        setLoading(false);
        return;
    }

    fetch(`${url}?${params.toString()}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.json();
      })
      .then(data => {
        setWatchlistData(Array.isArray(data) ? data : []);
      })
      .catch(e => {
        setError(e.message);
        setWatchlistData([]);
      })
      .finally(() => setLoading(false));
  }, [selectedWatchlistId, date]);

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
