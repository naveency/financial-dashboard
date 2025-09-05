'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';

// EMA calculation function
const calculateEMA = (data: number[], period: number): number[] => {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  // First value is simple moving average
  let sum = 0;
  for (let i = 0; i < period && i < data.length; i++) {
    sum += data[i];
  }
  ema[period - 1] = sum / period;
  
  // Calculate EMA for rest of the values
  for (let i = period; i < data.length; i++) {
    ema[i] = (data[i] * multiplier) + (ema[i - 1] * (1 - multiplier));
  }
  
  return ema;
};

interface CandlestickData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CandlestickChartProps {
  symbol: string | null;
}

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

  // Initialize chart when symbol is selected and container is ready
  useEffect(() => {
    if (!symbol) {
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

      console.log('Initializing chart for symbol:', symbol, { 
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
        console.log(`Fetching price data for symbol: ${symbol}`);
        setLoading(true);
        setError(null);

        try {
          const url = `http://127.0.0.1:8080/price-data/${symbol}?days=365`;
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

          // Calculate EMAs using close prices
          const closePrices = data.map(item => item.close);
          const ema21Values = calculateEMA(closePrices, 21);
          const ema200Values = calculateEMA(closePrices, 200);

          // Create EMA data for chart (only include values where EMA exists)
          const ema21Data = data.map((item, index) => ({
            time: item.time,
            value: ema21Values[index] || null,
          })).filter(item => item.value !== null) as { time: string; value: number }[];

          const ema200Data = data.map((item, index) => ({
            time: item.time,
            value: ema200Values[index] || null,
          })).filter(item => item.value !== null) as { time: string; value: number }[];

          // Set data to series
          candlestickSeries.setData(candlestickData);
          volumeSeries.setData(volumeData);
          ema21Series.setData(ema21Data);
          ema200Series.setData(ema200Data);

          // Fit content
          chart.timeScale().fitContent();

          console.log(`Successfully loaded ${data.length} data points, ${ema21Data.length} EMA21 points, ${ema200Data.length} EMA200 points for ${symbol}`);

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
  }, [symbol]);


  if (!symbol) {
    return (
      <div 
        className="flex-1 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-400 w-full"
      >
        Select a symbol to view chart
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

      <div className="mb-2 flex-shrink-0">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
          {symbol}
        </h3>
      </div>

      <div 
        ref={chartContainerRef} 
        className="flex-1 border border-zinc-200 dark:border-zinc-700 rounded-lg w-full"
      />
    </div>
  );
};