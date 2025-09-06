'use client';

import { useState, useEffect } from "react";
import { SidebarWithDateAndWatchlists, mockWatchlists } from "../components/sidebar-with-date-watchlists";
import { CandlestickChart } from "../components/candlestick-chart";
import { API_ENDPOINTS } from "../lib/api-config";
import { Input } from "../components/catalyst/input";
import { Button } from "../components/catalyst/button";
import { Checkbox, CheckboxField } from "../components/catalyst/checkbox";
import { Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle } from "../components/catalyst/dialog";

export default function Home() {
  const [selectedWatchlistId, setSelectedWatchlistId] = useState(mockWatchlists[0].id);
  const selectedWatchlist = mockWatchlists.find(w => w.id === selectedWatchlistId);
  const [watchlistData, setWatchlistData] = useState<Array<{
    symbol?: string; 
    ticker?: string; 
    name?: string;
    type?: string;
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
  const [sortColumn, setSortColumn] = useState<'symbol' | 'price' | 'change' | 'percent' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Settings state
  const [showETFs, setShowETFs] = useState(true);
  const [showCommonStock, setShowCommonStock] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [customSymbols, setCustomSymbols] = useState<string[]>([]);
  const [useCustomSymbols, setUseCustomSymbols] = useState(false);
  const [symbolInput, setSymbolInput] = useState('');
  
  // API key state
  const [userApiKey, setUserApiKey] = useState('');
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');

  // Sort watchlist components
  const handleSort = (column: 'symbol' | 'price' | 'change' | 'percent') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Filter watchlist based on settings
  const filteredWatchlistData = (watchlistData || []).filter(item => {
    const itemData = typeof item === 'object' && item !== null ? item as any : {};
    const itemSymbol = typeof item === 'string' 
      ? item 
      : itemData.symbol || itemData.ticker || itemData.name || '';
    
    // If custom symbols are enabled, filter by custom symbol list only
    if (useCustomSymbols) {
      return customSymbols.some(symbol => 
        symbol.toUpperCase() === itemSymbol.toUpperCase()
      );
    }
    
    // Otherwise, apply ETF/Common Stock filters
    const itemType = itemData.type || '';
    
    // If both filters are enabled, show all
    if (showETFs && showCommonStock) return true;
    
    // If neither filter is enabled, show nothing
    if (!showETFs && !showCommonStock) return false;
    
    // Check specific filters
    if (showETFs && (itemType.toLowerCase() === 'etf' || itemType.toLowerCase().includes('etf'))) return true;
    if (showCommonStock && (itemType.toLowerCase() === 'common stock' || itemType.toLowerCase() === 'stock' || itemType.toLowerCase() === 'common' || (!itemType || itemType === ''))) return true;
    
    return false;
  });

  const watchlistComponents = sortColumn ? filteredWatchlistData.slice().sort((a, b) => {
    const aData = typeof a === 'object' && a !== null ? a as any : {};
    const bData = typeof b === 'object' && b !== null ? b as any : {};
    
    let aValue: string | number;
    let bValue: string | number;
    
    switch (sortColumn) {
      case 'symbol':
        aValue = (typeof a === 'string' ? a : aData.symbol || aData.ticker || aData.name || '').toLowerCase();
        bValue = (typeof b === 'string' ? b : bData.symbol || bData.ticker || bData.name || '').toLowerCase();
        break;
      case 'price':
        aValue = aData.last_price || 0;
        bValue = bData.last_price || 0;
        break;
      case 'change':
        aValue = aData.price_change || 0;
        bValue = bData.price_change || 0;
        break;
      case 'percent':
        aValue = aData.percent_change || 0;
        bValue = bData.percent_change || 0;
        break;
      default:
        return 0;
    }
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    } else {
      const numA = Number(aValue);
      const numB = Number(bValue);
      return sortDirection === 'asc' ? numA - numB : numB - numA;
    }
  }) : filteredWatchlistData; // Use original server order when no sorting is applied

  // Theme detection and settings initialization - client-only to avoid hydration issues
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
    
    // Load filter settings from localStorage
    const savedShowETFs = localStorage.getItem('showETFs');
    const savedShowCommonStock = localStorage.getItem('showCommonStock');
    const savedCustomSymbols = localStorage.getItem('customSymbols');
    const savedUseCustomSymbols = localStorage.getItem('useCustomSymbols');
    const savedUserApiKey = localStorage.getItem('userApiKey');
    const savedIsRealTimeEnabled = localStorage.getItem('isRealTimeEnabled');
    
    if (savedShowETFs !== null) {
      setShowETFs(savedShowETFs === 'true');
    }
    if (savedShowCommonStock !== null) {
      setShowCommonStock(savedShowCommonStock === 'true');
    }
    if (savedCustomSymbols !== null) {
      try {
        const parsedSymbols = JSON.parse(savedCustomSymbols);
        if (Array.isArray(parsedSymbols)) {
          setCustomSymbols(parsedSymbols);
        }
      } catch (error) {
        console.warn('Failed to parse saved custom symbols:', error);
      }
    }
    if (savedUseCustomSymbols !== null) {
      setUseCustomSymbols(savedUseCustomSymbols === 'true');
    }
    if (savedUserApiKey !== null) {
      setUserApiKey(savedUserApiKey);
      setApiKeyInput(savedUserApiKey);
    }
    if (savedIsRealTimeEnabled !== null) {
      setIsRealTimeEnabled(savedIsRealTimeEnabled === 'true');
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

  // Settings handlers
  const handleShowETFsChange = (checked: boolean) => {
    setShowETFs(checked);
    localStorage.setItem('showETFs', checked.toString());
  };

  const handleShowCommonStockChange = (checked: boolean) => {
    setShowCommonStock(checked);
    localStorage.setItem('showCommonStock', checked.toString());
  };

  const handleUseCustomSymbolsChange = (checked: boolean) => {
    setUseCustomSymbols(checked);
    localStorage.setItem('useCustomSymbols', checked.toString());
  };

  const addSymbol = () => {
    const symbol = symbolInput.trim().toUpperCase();
    if (symbol && !customSymbols.includes(symbol)) {
      const newSymbols = [...customSymbols, symbol];
      setCustomSymbols(newSymbols);
      localStorage.setItem('customSymbols', JSON.stringify(newSymbols));
      setSymbolInput('');
    }
  };

  const removeSymbol = (symbolToRemove: string) => {
    const newSymbols = customSymbols.filter(symbol => symbol !== symbolToRemove);
    setCustomSymbols(newSymbols);
    localStorage.setItem('customSymbols', JSON.stringify(newSymbols));
  };

  const clearAllSymbols = () => {
    setCustomSymbols([]);
    localStorage.setItem('customSymbols', JSON.stringify([]));
  };

  // API key handlers
  const saveApiKey = () => {
    const trimmedKey = apiKeyInput.trim();
    setUserApiKey(trimmedKey);
    localStorage.setItem('userApiKey', trimmedKey);
    
    // Enable real-time if API key is provided
    const hasApiKey = trimmedKey.length > 0;
    setIsRealTimeEnabled(hasApiKey);
    localStorage.setItem('isRealTimeEnabled', hasApiKey.toString());
  };

  const clearApiKey = () => {
    setUserApiKey('');
    setApiKeyInput('');
    setIsRealTimeEnabled(false);
    localStorage.removeItem('userApiKey');
    localStorage.setItem('isRealTimeEnabled', 'false');
  };

  const toggleRealTime = (enabled: boolean) => {
    setIsRealTimeEnabled(enabled);
    localStorage.setItem('isRealTimeEnabled', enabled.toString());
  };

  // Helper function to build API URLs with user API key when real-time is enabled
  const buildApiUrl = (baseUrl: string, additionalParams?: Record<string, string>) => {
    const url = new URL(baseUrl);
    
    // Add user API key if real-time is enabled and key is available
    if (isRealTimeEnabled && userApiKey) {
      url.searchParams.set('api_key', userApiKey);
      url.searchParams.set('realtime', 'true');
    }
    
    // Add any additional parameters
    if (additionalParams) {
      Object.entries(additionalParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }
    
    return url.toString();
  };

  const addSymbolsFromInput = (input: string) => {
    // Parse comma-separated symbols
    const inputSymbols = input
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(s => s && !customSymbols.includes(s));
    
    if (inputSymbols.length > 0) {
      const newSymbols = [...customSymbols, ...inputSymbols];
      setCustomSymbols(newSymbols);
      localStorage.setItem('customSymbols', JSON.stringify(newSymbols));
    }
    setSymbolInput('');
  };

  const handleSymbolInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (symbolInput.includes(',')) {
        addSymbolsFromInput(symbolInput);
      } else {
        addSymbol();
      }
    }
  };

  // Close settings dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const settingsButton = target.closest('[data-settings-button]');
      const settingsDropdown = target.closest('[data-settings-dropdown]');
      
      if (!settingsButton && !settingsDropdown && showSettings) {
        setShowSettings(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettings]);

  useEffect(() => {
    // On mount, fetch the max date from the API and set it as the date
    fetch(buildApiUrl(API_ENDPOINTS.maxdate))
      .then(res => res.json())
      .then(data => {
        if (typeof data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
          setDate(data);
        } else if (data && typeof data === 'object' && 'date' in data) {
          setDate(data.date);
        }
      })
      .catch(e => console.error('Failed to fetch max date:', e));
  }, [isRealTimeEnabled, userApiKey]);

  useEffect(() => {
    if (!date || !selectedWatchlistId) return;

    setLoading(true);
    setError(null);
    setSelectedSymbol(null); // Clear selected symbol when watchlist changes
    setSortColumn(null); // Clear sorting when watchlist changes to preserve server order
    setSortDirection('asc');
    
    let baseUrl = '';
    const additionalParams: Record<string, string> = { date };
    
    switch (selectedWatchlistId) {
      case 'new-highs-63':
        baseUrl = API_ENDPOINTS.newHighs;
        additionalParams.period = '63';
        break;
      case 'new-highs-252':
        baseUrl = API_ENDPOINTS.newHighs;
        additionalParams.period = '252';
        break;
      case 'new-lows-63':
        baseUrl = API_ENDPOINTS.newLows;
        additionalParams.period = '63';
        break;
      case 'new-lows-252':
        baseUrl = API_ENDPOINTS.newLows;
        additionalParams.period = '252';
        break;
      case 'gapup':
        baseUrl = API_ENDPOINTS.gapup;
        break;
      case 'gapdown':
        baseUrl = API_ENDPOINTS.gapdown;
        break;
      case 'swing-high-cross-up':
        baseUrl = API_ENDPOINTS.swingHighCross;
        additionalParams.direction = 'up';
        break;
      case 'swing-high-cross-down':
        baseUrl = API_ENDPOINTS.swingHighCross;
        additionalParams.direction = 'down';
        break;
      case 'swing-low-cross-up':
        baseUrl = API_ENDPOINTS.swingLowCross;
        additionalParams.direction = 'up';
        break;
      case 'swing-low-cross-down':
        baseUrl = API_ENDPOINTS.swingLowCross;
        additionalParams.direction = 'down';
        break;
      case 'new-buys':
        baseUrl = API_ENDPOINTS.newSignals;
        additionalParams.signal = 'buy';
        break;
      case 'new-sells':
        baseUrl = API_ENDPOINTS.newSignals;
        additionalParams.signal = 'sell';
        break;
      case '52-week-rs':
        baseUrl = API_ENDPOINTS.weekRelativeStrength;
        break;
      default:
        setWatchlistData([]);
        setLoading(false);
        return;
    }

    fetch(buildApiUrl(baseUrl, additionalParams))
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.json();
      })
      .then(data => {
        const dataArray = Array.isArray(data) ? data : [];
        setWatchlistData(dataArray);
        
        // Note: Selected symbol will be set by separate useEffect based on filtered data
      })
      .catch(e => {
        setError(e.message);
        setWatchlistData([]);
        setSelectedSymbol(null);
      })
      .finally(() => setLoading(false));
  }, [selectedWatchlistId, date, isRealTimeEnabled, userApiKey]);

  // Auto-select first symbol from filtered watchlist when data or filters change
  useEffect(() => {
    // Only auto-select if no symbol is currently selected or if the current symbol is not in the filtered list
    const currentSymbolInFilteredList = watchlistComponents.some(item => {
      const itemSymbol = typeof item === 'string' 
        ? item 
        : item?.symbol || item?.ticker || item?.name || '';
      return itemSymbol === selectedSymbol;
    });

    // If current symbol is not in filtered list or no symbol is selected, select first from filtered list
    if (!selectedSymbol || !currentSymbolInFilteredList) {
      if (watchlistComponents.length > 0) {
        const firstItem = watchlistComponents[0];
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
    }
  }, [watchlistComponents, selectedSymbol]);

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
            userApiKey={userApiKey}
            isRealTimeEnabled={isRealTimeEnabled}
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
                userApiKey={userApiKey}
                isRealTimeEnabled={isRealTimeEnabled}
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
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">{selectedWatchlist?.name} Components</h2>
              {/* Data mode indicator */}
              {isRealTimeEnabled && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    Live
                  </span>
                </div>
              )}
            </div>
            <Button
              plain
              onClick={() => setShowSettings(true)}
              className="p-2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
            </Button>
          </div>
          {loading && <div>Loading...</div>}
          {error && <div className="text-red-500">{error}</div>}
          
          {/* Column Headers - Clickable for sorting */}
          <div 
            className="grid gap-1 px-3 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700"
            style={{
              gridTemplateColumns: 'minmax(60px, auto) minmax(60px, auto) minmax(50px, auto) minmax(40px, auto)'
            }}
          >
            <button 
              className="text-left hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors flex items-center gap-1"
              onClick={() => handleSort('symbol')}
            >
              Symbol
              {sortColumn === 'symbol' && (
                <span className="text-blue-500">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </button>
            <button 
              className="text-left hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors flex items-center gap-1"
              onClick={() => handleSort('price')}
            >
              Price
              {sortColumn === 'price' && (
                <span className="text-blue-500">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </button>
            <button 
              className="text-left hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors flex items-center gap-1"
              onClick={() => handleSort('change')}
            >
              Change
              {sortColumn === 'change' && (
                <span className="text-blue-500">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </button>
            <button 
              className="text-left hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors flex items-center gap-1"
              onClick={() => handleSort('percent')}
            >
              %
              {sortColumn === 'percent' && (
                <span className="text-blue-500">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </button>
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
        
        {/* Settings Dialog - Positioned at top level */}
        <Dialog 
          open={showSettings} 
          onClose={() => setShowSettings(false)}
          size="xl"
        >
      <DialogTitle>Settings</DialogTitle>
      <DialogDescription>
        Configure your real-time data and filtering options
      </DialogDescription>
      <DialogBody className="space-y-6">
        <div 
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
          onMouseDown={(e) => { e.stopPropagation(); }}
          onPointerDown={(e) => { e.stopPropagation(); }}
        >
        {/* API Key Section */}
        <div className="space-y-4">
          <div>
            <h4 className="text-base font-semibold text-zinc-900 dark:text-white mb-3">Real-time Data</h4>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  placeholder="Enter your EODHD API key"
                  className="flex-1 text-xs"
                />
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveApiKey();
                  }}
                  disabled={!apiKeyInput.trim()}
                  className="px-2 py-1 text-xs"
                >
                  Save
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isRealTimeEnabled && <div className="w-2 h-2 rounded-full bg-green-500"></div>}
                  <span className="text-xs text-zinc-600 dark:text-zinc-300">
                    {isRealTimeEnabled ? 'Real-time enabled' : 'Real-time disabled'}
                  </span>
                </div>
                {userApiKey && (
                  <div className="flex items-center gap-2">
                    <CheckboxField>
                      <Checkbox
                        checked={isRealTimeEnabled}
                        onChange={toggleRealTime}
                      />
                      <span className="text-xs text-zinc-600 dark:text-zinc-300">Enable</span>
                    </CheckboxField>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearApiKey();
                      }}
                      className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      plain
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </div>
              
              {userApiKey && (
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  API Key: ••••••••{userApiKey.slice(-4)}
                </div>
              )}
              
              <div className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1">
                <div>Enter your <a href="https://eodhd.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 underline">EODHD</a> API key to enable real-time data updates</div>
                <div className="text-zinc-400 dark:text-zinc-500">🔒 Your API key is stored locally and never sent to our servers</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Settings Section */}
        <div className="space-y-4">
          <div>
            <h4 className="text-base font-semibold text-zinc-900 dark:text-white mb-3">Filter Options</h4>
            
            {/* Custom Symbols Section */}
            <CheckboxField className="mb-3">
              <Checkbox
                checked={useCustomSymbols}
                onChange={handleUseCustomSymbolsChange}
              />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Use Custom Symbol List</span>
            </CheckboxField>
            
            {useCustomSymbols && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={symbolInput}
                    onChange={(e) => setSymbolInput(e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    onKeyPress={handleSymbolInputKeyPress}
                    placeholder="Enter symbols (e.g., AAPL, MSFT)"
                    className="flex-1 text-xs"
                  />
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (symbolInput.includes(',')) {
                        addSymbolsFromInput(symbolInput);
                      } else {
                        addSymbol();
                      }
                    }}
                    className="px-2 py-1 text-xs"
                  >
                    Add
                  </Button>
                </div>
                
                {customSymbols.length > 0 && (
                  <div className="max-h-20 overflow-y-auto">
                    <div className="flex flex-wrap gap-1">
                      {customSymbols.map((symbol) => (
                        <span
                          key={symbol}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded"
                        >
                          {symbol}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSymbol(symbol);
                            }}
                            className="text-blue-500 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-100"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {customSymbols.length === 0 
                      ? "Add symbols to create a custom filter list"
                      : `${customSymbols.length} symbol${customSymbols.length !== 1 ? 's' : ''} in your list`
                    }
                  </div>
                  {customSymbols.length > 0 && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearAllSymbols();
                      }}
                      className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      plain
                    >
                      Clear All
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Type Filters Section - Only show when not using custom symbols */}
          {!useCustomSymbols && (
            <div className="space-y-3 mb-4">
              <CheckboxField>
                <Checkbox
                  checked={showETFs}
                  onChange={handleShowETFsChange}
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Show ETFs</span>
              </CheckboxField>
              <CheckboxField>
                <Checkbox
                  checked={showCommonStock}
                  onChange={handleShowCommonStockChange}
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Show Common Stock</span>
              </CheckboxField>
            </div>
          )}

          {/* Statistics */}
          <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              {useCustomSymbols 
                ? `Showing ${watchlistComponents.length} of ${customSymbols.length} custom symbols`
                : `Showing ${watchlistComponents.length} of ${(watchlistData || []).length} securities`
              }
            </div>
          </div>
        </div>
        </div>
      </DialogBody>
        <DialogActions>
          <Button onClick={() => setShowSettings(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      </div>
    </div>
  );
}
