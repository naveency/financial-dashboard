'use client';

import { useState, useEffect } from "react";
import { SidebarWithDateAndWatchlists, mockWatchlists } from "../components/sidebar-with-date-watchlists";
import { CandlestickChart } from "../components/candlestick-chart";

export default function Home() {
  const [selectedWatchlistId, setSelectedWatchlistId] = useState(mockWatchlists[0].id);
  const selectedWatchlist = mockWatchlists.find(w => w.id === selectedWatchlistId);
  const [watchlistData, setWatchlistData] = useState<Array<{
    symbol?: string; 
    ticker?: string; 
    name?: string;
    last_price?: number;
    price_change?: number;
    percent_change?: number;
  }> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState<string>("");
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

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
    const params = new URLSearchParams({ date });
    
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
        console.log('Watchlist data received:', data);
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
          {/* Candlestick chart */}
          <div className="flex-1 flex flex-col p-4">
            <CandlestickChart 
              symbol={selectedSymbol}
            />
          </div>
        </div>
        <div className="w-96 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex flex-col gap-4 h-screen overflow-y-auto">
          <h2 className="text-lg font-semibold mb-2">{selectedWatchlist?.name} Components</h2>
          {loading && <div>Loading...</div>}
          {error && <div className="text-red-500">{error}</div>}
          
          {/* Column Headers */}
          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700">
            <div className="col-span-4">Symbol</div>
            <div className="col-span-3 text-right">Price</div>
            <div className="col-span-3 text-right">Change</div>
            <div className="col-span-2 text-right">%</div>
          </div>
          
          <ul className="flex flex-col gap-1">
            {watchlistComponents.map((item, idx) => {
              const symbol = typeof item === 'string'
                ? item
                : (item && typeof item === 'object' && ('symbol' in item || 'ticker' in item || 'name' in item))
                  ? (item as { symbol?: string; ticker?: string; name?: string }).symbol || 
                    (item as { symbol?: string; ticker?: string; name?: string }).ticker || 
                    (item as { symbol?: string; ticker?: string; name?: string }).name
                  : JSON.stringify(item);
              
              const isSelected = selectedSymbol === symbol;
              const itemData = typeof item === 'object' && item !== null ? item as any : {};
              const lastPrice = itemData.last_price;
              const priceChange = itemData.price_change;
              const percentChange = itemData.percent_change;
              
              const isPositive = priceChange > 0;
              const isNegative = priceChange < 0;
              const changeColor = isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-zinc-500';
              
              return (
                <li 
                  key={(symbol || 'unknown') + idx} 
                  className={`grid grid-cols-12 gap-2 rounded px-3 py-2 cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                  onClick={() => {
                    console.log('Symbol clicked:', symbol);
                    setSelectedSymbol(symbol || null);
                  }}
                >
                  <div className="col-span-4 font-medium">
                    {symbol || 'Unknown'}
                  </div>
                  <div className="col-span-3 text-right text-sm">
                    {lastPrice ? `$${lastPrice.toFixed(2)}` : '-'}
                  </div>
                  <div className={`col-span-3 text-right text-sm ${isSelected ? 'text-white' : changeColor}`}>
                    {priceChange ? `${isPositive ? '+' : ''}${priceChange.toFixed(2)}` : '-'}
                  </div>
                  <div className={`col-span-2 text-right text-sm ${isSelected ? 'text-white' : changeColor}`}>
                    {percentChange ? `${isPositive ? '+' : ''}${percentChange.toFixed(1)}%` : '-'}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </main>
    </div>
  );
}
