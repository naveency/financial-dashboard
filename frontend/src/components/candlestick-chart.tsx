'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';
import { API_ENDPOINTS } from '../lib/api-config';
import { getRealtimeService, RealtimePrice } from '../lib/realtime-data';
import { shouldEnableRealtimeData, getMarketStatusDisplay, shouldEnableRealtimeDataSync, getMarketStatusDisplaySync } from '../lib/market-hours';

interface CandlestickData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ema_21?: number | null;
  ema_200?: number | null;
}

interface CandlestickChartProps {
  symbol: string | null;
  isDarkMode?: boolean;
}

type TimePeriod = '3M' | '6M' | '1Y' | '2Y' | '5Y';

const TIME_PERIODS: { label: string; value: TimePeriod; days: number }[] = [
  { label: '3 Months', value: '3M', days: 90 },
  { label: '6 Months', value: '6M', days: 180 },
  { label: '1 Year', value: '1Y', days: 365 },
  { label: '2 Years', value: '2Y', days: 730 },
  { label: '5 Years', value: '5Y', days: 1825 },
];

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  symbol,
  isDarkMode = false,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const ema21SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema200SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Input controls state
  const [inputSymbol, setInputSymbol] = useState(symbol || '');
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1Y');
  const [displaySymbol, setDisplaySymbol] = useState(symbol);
  
  // OHLCV display state
  const [selectedOHLCV, setSelectedOHLCV] = useState<CandlestickData | null>(null);
  const [chartData, setChartData] = useState<CandlestickData[]>([]);
  
  // Realtime data state
  const [isRealtimeEnabled, setIsRealtimeEnabled] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [marketStatus, setMarketStatus] = useState<string>('');

  // Initialize chart when symbol is selected and container is ready
  useEffect(() => {
    if (!displaySymbol) {
      // Clean up existing chart when no symbol is selected
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        candlestickSeriesRef.current = null;
        volumeSeriesRef.current = null;
        ema21SeriesRef.current = null;
        ema200SeriesRef.current = null;
      }
      return;
    }

    const initChart = () => {
      if (!chartContainerRef.current) {
        return null;
      }

      // Ensure container has dimensions
      if (chartContainerRef.current.clientWidth === 0) {
        return null;
      }

      const containerHeight = chartContainerRef.current.clientHeight || 600; // fallback height
    
      // Create chart
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: isDarkMode ? '#d1d5db' : '#374151',
        },
        grid: {
          vertLines: { color: isDarkMode ? '#374151' : '#e5e7eb' },
          horzLines: { color: isDarkMode ? '#374151' : '#e5e7eb' },
        },
        width: chartContainerRef.current.clientWidth,
        height: containerHeight,
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
        },
        rightPriceScale: {
          borderVisible: false,
          scaleMargins: { top: 0.1, bottom: 0.1 },
          minimumWidth: 80, // Provide more space for EMA labels
        },
      });

      // Create candlestick series
      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      });

      // Create volume series
      const volumeSeries = chart.addHistogramSeries({
        color: isDarkMode ? '#6b7280' : '#9ca3af',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: 'volume',
      });

      // Create EMA line series with last values visible but no titles
      const ema21Series = chart.addLineSeries({
        color: '#ff6b35', // Orange color for 21 EMA
        lineWidth: 2,
        lastValueVisible: true, // Show last value on right edge
        priceLineVisible: false, // Remove horizontal price lines to reduce clutter
      });

      const ema200Series = chart.addLineSeries({
        color: '#1e40af', // Blue color for 200 EMA
        lineWidth: 2,
        lastValueVisible: true, // Show last value on right edge
        priceLineVisible: false, // Remove horizontal price lines to reduce clutter
      });

      // Set volume series to bottom pane
      chart.priceScale('volume').applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });

      chartRef.current = chart;
      candlestickSeriesRef.current = candlestickSeries;
      volumeSeriesRef.current = volumeSeries;
      ema21SeriesRef.current = ema21Series;
      ema200SeriesRef.current = ema200Series;

      // Handle resize
      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        }
      };

      window.addEventListener('resize', handleResize);

      // Define and call fetchData function
      const fetchData = async () => {
        setLoading(true);
        setError(null);

        const selectedPeriodData = TIME_PERIODS.find(p => p.value === selectedPeriod);
        const days = selectedPeriodData?.days || 365;

        try {
          const url = `${API_ENDPOINTS.priceData}/${displaySymbol}?days=${days}`;
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data: CandlestickData[] = await response.json();
          
          if (data.length === 0) {
            throw new Error('No price data available');
          }


          // Store the original data for OHLCV display
          setChartData(data);

          // Convert data for TradingView format
          // Helper functions to ensure consistent timestamp conversion
          const convertToTimestamp = (dateString: string): number => {
            // Parse as local date to avoid timezone shifts
            const [year, month, day] = dateString.split('-').map(Number);
            const date = new Date(year, month - 1, day); // month is 0-indexed
            return Math.floor(date.getTime() / 1000); // Convert to Unix timestamp
          };

          const convertFromTimestamp = (timestamp: number): string => {
            // Convert back using same local date logic
            const date = new Date(timestamp * 1000);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          };

          const candlestickData = data.map(item => ({
            time: convertToTimestamp(item.time),
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
          }));

          const volumeData = data.map(item => ({
            time: convertToTimestamp(item.time),
            value: item.volume,
            color: item.close > item.open ? '#22c55e40' : '#ef444440',
          }));

          // Extract EMA data from API response (only include values where EMA exists)
          const ema21Data = data
            .filter(item => item.ema_21 !== null && item.ema_21 !== undefined)
            .map(item => ({
              time: convertToTimestamp(item.time),
              value: item.ema_21!,
            }));

          const ema200Data = data
            .filter(item => item.ema_200 !== null && item.ema_200 !== undefined)
            .map(item => ({
              time: convertToTimestamp(item.time),
              value: item.ema_200!,
            }));


          // Set data to series
          candlestickSeries.setData(candlestickData);
          volumeSeries.setData(volumeData);
          ema21Series.setData(ema21Data);
          ema200Series.setData(ema200Data);

          // Add crosshair move handler for OHLCV display
          chart.subscribeCrosshairMove((param) => {
            if (param.time) {
              // Convert the timestamp back to date string using our helper function
              const paramTimestamp = typeof param.time === 'number' ? param.time : parseInt(param.time as string);
              const paramDateString = convertFromTimestamp(paramTimestamp);
              
              // Find the data point that matches the crosshair date
              const matchingData = data.find(item => item.time === paramDateString);
              if (matchingData) {
                setSelectedOHLCV(matchingData);
              }
            } else {
              // Show the latest data point when crosshair is not active
              if (data.length > 0) {
                setSelectedOHLCV(data[data.length - 1]);
              }
            }
          });

          // Set initial OHLCV to latest data point
          if (data.length > 0) {
            setSelectedOHLCV(data[data.length - 1]);
          }

          // Fit content
          chart.timeScale().fitContent();

        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to fetch data');
          console.error('Error fetching price data:', err);
        } finally {
          setLoading(false);
        }
      };

      // Now fetch data for the symbol
      fetchData();

      return chart;
    };

    // Small delay to ensure the DOM has rendered the chart container
    const timer = setTimeout(() => {
      initChart();
    }, 50);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', () => {});
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        candlestickSeriesRef.current = null;
        volumeSeriesRef.current = null;
        ema21SeriesRef.current = null;
        ema200SeriesRef.current = null;
      }
    };
  }, [displaySymbol, selectedPeriod, isDarkMode]);

  // Handle symbol input and search
  const handleSymbolSearch = () => {
    if (inputSymbol.trim()) {
      setDisplaySymbol(inputSymbol.trim().toUpperCase());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSymbolSearch();
    }
  };

  // Update input symbol when prop symbol changes
  useEffect(() => {
    if (symbol) {
      setInputSymbol(symbol);
      setDisplaySymbol(symbol);
    }
  }, [symbol]);

  // Realtime data management
  useEffect(() => {
    const realtimeService = getRealtimeService();
    
    // Check market status using EODHD API (async)
    const checkMarketStatus = async () => {
      // Use the proper async version to get EODHD data
      const shouldEnable = await shouldEnableRealtimeData();
      
      // Force enable realtime for specific symbols in development
      const isDemoSymbol = ['AAPL', 'MSFT', 'TSLA'].includes(displaySymbol?.toUpperCase() || '');
      const forceEnable = process.env.NODE_ENV === 'development' && isDemoSymbol;
      
      const realtimeEnabled = shouldEnable || forceEnable;
      setIsRealtimeEnabled(realtimeEnabled);
      setMarketStatus(await getMarketStatusDisplay());
      
      
      return realtimeEnabled;
    };
    
    // Execute async market status check
    checkMarketStatus().then((realtimeEnabled) => {
      if (!realtimeEnabled || !displaySymbol) {
        // Clean up any existing connections
        if (realtimeService.getStatus() === 'connected') {
          realtimeService.unsubscribeFromSymbol(displaySymbol || '');
        }
        return;
      }

    // Set up realtime data callbacks
    realtimeService.onData((data: RealtimePrice) => {
      if (data.symbol === displaySymbol) {
        setLastPrice(data.price);
        
        // Update the chart with realtime price
        if (candlestickSeriesRef.current) {
          const currentDate = new Date().toISOString().split('T')[0]; // Get current date (YYYY-MM-DD)
          const currentTimestamp = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000); // Today's timestamp
          
          if (chartData.length > 0) {
            const lastCandle = chartData[chartData.length - 1];
            
            // If it's the same day as the last candle, update it
            if (lastCandle.time === currentDate) {
              const updatedCandle = {
                ...lastCandle,
                close: data.price,
                high: Math.max(lastCandle.high, data.price),
                low: Math.min(lastCandle.low, data.price),
              };
              
              candlestickSeriesRef.current.update({
                time: currentTimestamp,
                open: updatedCandle.open,
                high: updatedCandle.high,
                low: updatedCandle.low,
                close: updatedCandle.close,
              });
              
              // Update our local data too
              const newChartData = [...chartData];
              newChartData[newChartData.length - 1] = updatedCandle;
              setChartData(newChartData);
            } else {
              // Create a new candle for today
              const previousClose = lastCandle.close;
              const newCandle = {
                time: currentDate,
                open: previousClose, // Use previous close as today's open
                high: Math.max(previousClose, data.price),
                low: Math.min(previousClose, data.price),
                close: data.price,
                volume: 0, // We don't have volume from price updates
              };
              
              candlestickSeriesRef.current.update({
                time: currentTimestamp,
                open: newCandle.open,
                high: newCandle.high,
                low: newCandle.low,
                close: newCandle.close,
              });
              
              // Add to our local data
              const newChartData = [...chartData, newCandle];
              setChartData(newChartData);
            }
          } else {
            // No historical data - create first candle
            const newCandle = {
              time: currentDate,
              open: data.price,
              high: data.price,
              low: data.price,
              close: data.price,
              volume: 0,
            };
            
            candlestickSeriesRef.current.update({
              time: currentTimestamp,
              open: newCandle.open,
              high: newCandle.high,
              low: newCandle.low,
              close: newCandle.close,
            });
            
            setChartData([newCandle]);
          }
        }
      }
    });

    realtimeService.onError((error: Error) => {
      setRealtimeStatus('error');
    });

    realtimeService.onStatusChange((status) => {
      setRealtimeStatus(status);
    });

      // Connect and subscribe
      realtimeService.connect()
        .then(() => {
          realtimeService.subscribeToSymbol(displaySymbol);
        })
        .catch((error) => {
          setRealtimeStatus('error');
        });
    });

    // Cleanup function
    return () => {
      if (displaySymbol) {
        realtimeService.unsubscribeFromSymbol(displaySymbol);
      }
    };
  }, [displaySymbol, chartData]);

  if (!symbol && !displaySymbol) {
    return (
      <div className="flex-1 flex flex-col relative">
        <div className="mb-4 flex-shrink-0 space-y-3">
          {/* Input controls */}
          <div className="flex gap-3 items-center">
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={inputSymbol}
                onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                placeholder="Enter symbol (e.g., AAPL)"
                className="px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{ minWidth: '150px' }}
              />
              <button
                onClick={handleSymbolSearch}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Search
              </button>
            </div>
            
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as TimePeriod)}
              className="px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {TIME_PERIODS.map((period) => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div 
          className="flex-1 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-400 w-full"
        >
          Enter a symbol and click Search to view chart
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded-lg z-10">
          <div className="text-zinc-400">Loading chart...</div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded-lg z-10">
          <div className="text-red-500">{error}</div>
        </div>
      )}

      <div className="mb-4 flex-shrink-0 space-y-3">
        {/* Input controls */}
        <div className="flex gap-3 items-center">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={inputSymbol}
              onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
              onKeyPress={handleKeyPress}
              placeholder="Enter symbol (e.g., AAPL)"
              className="px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              style={{ minWidth: '150px' }}
            />
            <button
              onClick={handleSymbolSearch}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Search
            </button>
          </div>
          
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as TimePeriod)}
            className="px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {TIME_PERIODS.map((period) => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
        </div>

        {/* Symbol title and OHLCV data */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
              {displaySymbol || symbol}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {isRealtimeEnabled && (
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {marketStatus}
                </span>
              )}
              {isRealtimeEnabled && realtimeStatus === 'connected' && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs text-green-500 font-medium">
                    Live
                  </span>
                </div>
              )}
              {lastPrice && (
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  ${lastPrice.toFixed(2)}
                </span>
              )}
            </div>
          </div>
          
          {selectedOHLCV && (
            <div className="flex gap-4 text-sm">
              <div className="flex flex-col">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase">Date</span>
                <span className="font-medium text-zinc-900 dark:text-white">
                  {(() => {
                    const [year, month, day] = selectedOHLCV.time.split('-');
                    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString();
                  })()}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase">O</span>
                <span className="font-medium text-zinc-900 dark:text-white">
                  ${selectedOHLCV.open.toFixed(2)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase">H</span>
                <span className="font-medium text-zinc-900 dark:text-white">
                  ${selectedOHLCV.high.toFixed(2)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase">L</span>
                <span className="font-medium text-zinc-900 dark:text-white">
                  ${selectedOHLCV.low.toFixed(2)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase">C</span>
                <span className="font-medium text-zinc-900 dark:text-white">
                  ${selectedOHLCV.close.toFixed(2)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase">Vol</span>
                <span className="font-medium text-zinc-900 dark:text-white">
                  {selectedOHLCV.volume.toLocaleString()}
                </span>
              </div>
              {selectedOHLCV.ema_21 && (
                <div className="flex flex-col">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase">EMA21</span>
                  <span className="font-medium" style={{ color: '#ff6b35' }}>
                    ${selectedOHLCV.ema_21.toFixed(2)}
                  </span>
                </div>
              )}
              {selectedOHLCV.ema_200 && (
                <div className="flex flex-col">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase">EMA200</span>
                  <span className="font-medium" style={{ color: '#1e40af' }}>
                    ${selectedOHLCV.ema_200.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div 
        ref={chartContainerRef} 
        className="flex-1 border border-zinc-200 dark:border-zinc-700 rounded-lg w-full"
      />
    </div>
  );
};