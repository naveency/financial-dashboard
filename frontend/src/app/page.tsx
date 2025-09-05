'use client';

import { useState, useEffect } from "react";
import { SidebarWithDateAndWatchlists, mockWatchlists } from "../components/sidebar-with-date-watchlists";
import { CandlestickChart } from "../components/candlestick-chart";
import { API_ENDPOINTS } from "../lib/api-config";

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
  const [rightPanelWidth, setRightPanelWidth] = useState(384); // 24rem = 384px
  const [isResizing, setIsResizing] = useState(false);

  // Get watchlist components from API data
  const watchlistComponents = watchlistData || [];

  useEffect(() => {
    // On mount, fetch the max date from the API and set it as the date
    fetch(API_ENDPOINTS.maxdate)
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
    setSelectedSymbol(null); // Clear selected symbol when watchlist changes
    
    let url = '';
    const params = new URLSearchParams({ date });
    
    switch (selectedWatchlistId) {
      case 'new-highs-63':
        url = API_ENDPOINTS.newHighs;
        params.append('period', '63');
        break;
      case 'new-highs-252':
        url = API_ENDPOINTS.newHighs;
        params.append('period', '252');
        break;
      case 'new-lows-63':
        url = API_ENDPOINTS.newLows;
        params.append('period', '63');
        break;
      case 'new-lows-252':
        url = API_ENDPOINTS.newLows;
        params.append('period', '252');
        break;
      case 'gapup':
        url = API_ENDPOINTS.gapup;
        break;
      case 'gapdown':
        url = API_ENDPOINTS.gapdown;
        break;
      case 'swing-high-cross-up':
        url = API_ENDPOINTS.swingHighCross;
        params.append('direction', 'up');
        break;
      case 'swing-high-cross-down':
        url = API_ENDPOINTS.swingHighCross;
        params.append('direction', 'down');
        break;
      case 'swing-low-cross-up':
        url = API_ENDPOINTS.swingLowCross;
        params.append('direction', 'up');
        break;
      case 'swing-low-cross-down':
        url = API_ENDPOINTS.swingLowCross;
        params.append('direction', 'down');
        break;
      case 'new-buys':
        url = API_ENDPOINTS.newSignals;
        params.append('signal', 'buy');
        break;
      case 'new-sells':
        url = API_ENDPOINTS.newSignals;
        params.append('signal', 'sell');
        break;
      case '52-week-rs':
        url = API_ENDPOINTS.weekRelativeStrength;
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
        const dataArray = Array.isArray(data) ? data : [];
        setWatchlistData(dataArray);
        
        // Auto-select first symbol when watchlist data is loaded
        if (dataArray.length > 0) {
          const firstItem = dataArray[0];
          const firstSymbol = typeof firstItem === 'string'
            ? firstItem
            : (firstItem && typeof firstItem === 'object' && ('symbol' in firstItem || 'ticker' in firstItem || 'name' in firstItem))
              ? (firstItem as { symbol?: string; ticker?: string; name?: string }).symbol || 
                (firstItem as { symbol?: string; ticker?: string; name?: string }).ticker || 
                (firstItem as { symbol?: string; ticker?: string; name?: string }).name
              : null;
          setSelectedSymbol(firstSymbol || null);
        } else {
          setSelectedSymbol(null);
        }
      })
      .catch(e => {
        setError(e.message);
        setWatchlistData([]);
        setSelectedSymbol(null);
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
        <div 
          className="border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex flex-col gap-4 h-screen overflow-y-auto relative"
          style={{ width: `${rightPanelWidth}px`, minWidth: '280px', maxWidth: '50vw' }}
        >
          {/* Resize handle */}
          <div 
            className="absolute left-0 top-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 transition-colors"
            onMouseDown={(e) => {
              setIsResizing(true);
              const startX = e.clientX;
              const startWidth = rightPanelWidth;
              
              const handleMouseMove = (e: MouseEvent) => {
                const deltaX = startX - e.clientX;
                const newWidth = Math.max(280, Math.min(window.innerWidth * 0.5, startWidth + deltaX));
                setRightPanelWidth(newWidth);
              };
              
              const handleMouseUp = () => {
                setIsResizing(false);
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          />
          <h2 className="text-lg font-semibold mb-2">{selectedWatchlist?.name} Components</h2>
          {loading && <div>Loading...</div>}
          {error && <div className="text-red-500">{error}</div>}
          
          {/* Column Headers - Using CSS Grid with fr units for flexible columns */}
          <div 
            className="grid gap-1 px-3 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700"
            style={{
              gridTemplateColumns: 'minmax(60px, 1fr) minmax(60px, auto) minmax(50px, auto) minmax(40px, auto)'
            }}
          >
            <div className="text-left">Symbol</div>
            <div className="text-left">Price</div>
            <div className="text-left">Change</div>
            <div className="text-left">%</div>
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
                  className={`grid gap-1 rounded px-3 py-2 cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                  style={{
                    gridTemplateColumns: 'minmax(60px, 1fr) minmax(60px, auto) minmax(50px, auto) minmax(40px, auto)'
                  }}
                  onClick={() => {
                    console.log('Symbol clicked:', symbol);
                    setSelectedSymbol(symbol || null);
                  }}
                >
                  <div className="font-medium text-left truncate">
                    {symbol || 'Unknown'}
                  </div>
                  <div className="text-left text-sm whitespace-nowrap">
                    {lastPrice ? `$${lastPrice.toFixed(2)}` : '-'}
                  </div>
                  <div className={`text-left text-sm whitespace-nowrap ${isSelected ? 'text-white' : changeColor}`}>
                    {priceChange ? `${isPositive ? '+' : ''}${priceChange.toFixed(2)}` : '-'}
                  </div>
                  <div className={`text-left text-sm whitespace-nowrap ${isSelected ? 'text-white' : changeColor}`}>
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
