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
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Get watchlist components from API data
  const watchlistComponents = watchlistData || [];

  // Theme detection and initialization - client-only to avoid hydration issues
  useEffect(() => {
    setMounted(true);
    
    // Check if user has a saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      const isDark = savedTheme === 'dark';
      setIsDarkMode(isDark);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      // Auto-detect system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDark);
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('theme', prefersDark ? 'dark' : 'light');
    }
  }, []);

  // Apply theme changes to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

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

  // Prevent hydration issues by not rendering theme-dependent content until mounted
  if (!mounted) {
    return <div className="flex flex-col min-h-screen bg-white"><div className="flex justify-end items-center p-4"><div className="w-8 h-8"></div></div></div>;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
      {/* Mobile Layout */}
      <div className="lg:hidden flex flex-col min-h-screen">
        <div className="border-b border-zinc-200 dark:border-zinc-800">
          <SidebarWithDateAndWatchlists
            selectedWatchlistId={selectedWatchlistId}
            onSelectWatchlist={setSelectedWatchlistId}
            date={date}
            setDate={setDate}
            isDarkMode={isDarkMode}
            toggleTheme={toggleTheme}
          />
        </div>
        
        {/* Chart Section - Mobile */}
        <main className="flex-1 p-2 sm:p-4 bg-white dark:bg-zinc-900">
          <CandlestickChart 
            symbol={selectedSymbol} 
            isDarkMode={isDarkMode}
          />
        </main>

        {/* Watchlist Section - Mobile */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 max-h-64 overflow-y-auto">
          <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Watchlist
          </h3>
          
          {/* Mobile Watchlist Grid */}
          <div className="grid grid-cols-1 gap-2">
            {watchlistComponents.map((item, index) => {
              const symbol = typeof item === 'string' 
                ? item 
                : item?.symbol || item?.ticker || item?.name || `Item ${index + 1}`;
              const displaySymbol = typeof symbol === 'string' ? symbol : String(symbol);
              const price = typeof item === 'object' && item ? item.last_price : null;
              const change = typeof item === 'object' && item ? item.price_change : null;
              const percentChange = typeof item === 'object' && item ? item.percent_change : null;

              return (
                <div
                  key={index}
                  onClick={() => setSelectedSymbol(displaySymbol)}
                  className={`flex justify-between items-center p-3 rounded cursor-pointer transition-colors ${
                    selectedSymbol === displaySymbol
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <div>
                    <div className="font-medium text-sm">{displaySymbol}</div>
                    {price && <div className="text-xs text-zinc-500 dark:text-zinc-400">${price.toFixed(2)}</div>}
                  </div>
                  {change !== null && percentChange !== null && (
                    <div className={`text-xs font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {change >= 0 ? '+' : ''}${change.toFixed(2)} ({change >= 0 ? '+' : ''}{percentChange.toFixed(2)}%)
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex min-h-screen">
        <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <SidebarWithDateAndWatchlists
            selectedWatchlistId={selectedWatchlistId}
            onSelectWatchlist={setSelectedWatchlistId}
            date={date}
            setDate={setDate}
            isDarkMode={isDarkMode}
            toggleTheme={toggleTheme}
          />
        </aside>
        <main className="flex-1 flex">
          <div className="flex-1 flex">
            {/* Candlestick chart */}
            <div className="flex-1 flex flex-col p-4 bg-white dark:bg-zinc-900">
              <CandlestickChart 
                symbol={selectedSymbol}
                isDarkMode={isDarkMode}
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
              gridTemplateColumns: 'minmax(60px, auto) minmax(60px, auto) minmax(50px, auto) minmax(40px, auto)'
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
                    gridTemplateColumns: 'minmax(60px, auto) minmax(60px, auto) minmax(50px, auto) minmax(40px, auto)'
                  }}
                  onClick={() => {
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
    </div>
  );
}
