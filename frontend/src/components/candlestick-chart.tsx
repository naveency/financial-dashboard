'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';

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
        console.log('Chart container not ready yet');
        return null;
      }

      console.log('Initializing chart for symbol:', displaySymbol, { 
        containerWidth: chartContainerRef.current.clientWidth,
        containerHeight: chartContainerRef.current.clientHeight 
      });
      
      // Ensure container has dimensions
      if (chartContainerRef.current.clientWidth === 0) {
        console.log('Container width is 0, cannot initialize chart');
        return null;
      }

      const containerHeight = chartContainerRef.current.clientHeight || 600; // fallback height
      
      console.log('Creating chart with dimensions:', {
        width: chartContainerRef.current.clientWidth,
        height: containerHeight
      });
    
      // Create chart
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: '#d1d5db',
        },
        grid: {
          vertLines: { color: '#374151' },
          horzLines: { color: '#374151' },
        },
        width: chartContainerRef.current.clientWidth,
        height: containerHeight,
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
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
        color: '#6b7280',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: 'volume',
      });

      // Create EMA line series
      const ema21Series = chart.addLineSeries({
        color: '#ff6b35', // Orange color for 21 EMA
        lineWidth: 2,
        title: 'EMA 21',
      });

      const ema200Series = chart.addLineSeries({
        color: '#1e40af', // Blue color for 200 EMA
        lineWidth: 2,
        title: 'EMA 200',
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
      
      console.log('Chart initialized successfully', {
        hasChart: !!chart,
        hasCandlestickSeries: !!candlestickSeries,
        hasVolumeSeries: !!volumeSeries
      });

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
        console.log(`Fetching price data for symbol: ${displaySymbol}`);
        setLoading(true);
        setError(null);

        const selectedPeriodData = TIME_PERIODS.find(p => p.value === selectedPeriod);
        const days = selectedPeriodData?.days || 365;

        try {
          const url = `http://127.0.0.1:8080/price-data/${displaySymbol}?days=${days}`;
          console.log(`Making API call to: ${url}`);
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data: CandlestickData[] = await response.json();
          
          if (data.length === 0) {
            throw new Error('No price data available');
          }

          // Convert data for TradingView format
          const candlestickData = data.map(item => ({
            time: item.time,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
          }));

          const volumeData = data.map(item => ({
            time: item.time,
            value: item.volume,
            color: item.close > item.open ? '#22c55e40' : '#ef444440',
          }));

          // Extract EMA data from API response (only include values where EMA exists)
          const ema21Data = data
            .filter(item => item.ema_21 !== null && item.ema_21 !== undefined)
            .map(item => ({
              time: item.time,
              value: item.ema_21!,
            }));

          const ema200Data = data
            .filter(item => item.ema_200 !== null && item.ema_200 !== undefined)
            .map(item => ({
              time: item.time,
              value: item.ema_200!,
            }));

          // Set data to series
          candlestickSeries.setData(candlestickData);
          volumeSeries.setData(volumeData);
          ema21Series.setData(ema21Data);
          ema200Series.setData(ema200Data);

          // Fit content
          chart.timeScale().fitContent();

          console.log(`Successfully loaded ${data.length} data points, ${ema21Data.length} EMA21 points, ${ema200Data.length} EMA200 points for ${displaySymbol}`);

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
  }, [displaySymbol, selectedPeriod]);

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

        {/* Symbol title */}
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
          {displaySymbol || symbol}
        </h3>
      </div>

      <div 
        ref={chartContainerRef} 
        className="flex-1 border border-zinc-200 dark:border-zinc-700 rounded-lg w-full"
      />
    </div>
  );
};