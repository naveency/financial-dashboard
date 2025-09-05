/**
 * EODHD WebSocket service for realtime stock data
 * Handles live price updates during market hours
 */

export interface RealtimePrice {
  symbol: string;
  price: number;
  size?: number;
  timestamp: number;
  marketStatus?: string;
  condition?: string;
}

export interface RealtimeCandle {
  symbol: string;
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

type RealtimeDataCallback = (data: RealtimePrice) => void;
type ErrorCallback = (error: Error) => void;
type StatusCallback = (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;

export class EODHDRealtimeService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private subscribedSymbols = new Set<string>();
  private dataCallback: RealtimeDataCallback | null = null;
  private errorCallback: ErrorCallback | null = null;
  private statusCallback: StatusCallback | null = null;
  
  private readonly apiToken: string;
  private readonly wsUrl: string;

  constructor() {
    this.apiToken = process.env.NEXT_PUBLIC_EODHD_API_TOKEN || '';
    this.wsUrl = process.env.NEXT_PUBLIC_EODHD_WS_US_TRADE || '';
    
    if (!this.apiToken || !this.wsUrl) {
      throw new Error('EODHD API token and WebSocket URL are required');
    }
  }

  /**
   * Connect to EODHD WebSocket
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.statusCallback?.('connecting');
        
        const wsUrlWithAuth = `${this.wsUrl}?api_token=${this.apiToken}`;
        this.ws = new WebSocket(wsUrlWithAuth);

        this.ws.onopen = () => {
          console.log('EODHD WebSocket connected');
          this.reconnectAttempts = 0;
          this.statusCallback?.('connected');
          
          // Re-subscribe to any previously subscribed symbols
          this.subscribedSymbols.forEach(symbol => {
            this.subscribeToSymbol(symbol);
          });
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
            this.errorCallback?.(error as Error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('EODHD WebSocket disconnected:', event.code, event.reason);
          this.statusCallback?.('disconnected');
          
          // Attempt to reconnect if not manually closed
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('EODHD WebSocket error:', error);
          this.statusCallback?.('error');
          this.errorCallback?.(new Error('WebSocket connection error'));
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    this.subscribedSymbols.clear();
  }

  /**
   * Subscribe to real-time data for a symbol
   */
  subscribeToSymbol(symbol: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // Store for later subscription when connected
      this.subscribedSymbols.add(symbol);
      return;
    }

    const subscribeMessage = {
      action: 'subscribe',
      symbols: symbol
    };

    this.ws.send(JSON.stringify(subscribeMessage));
    this.subscribedSymbols.add(symbol);
    console.log(`Subscribed to realtime data for ${symbol}`);
  }

  /**
   * Unsubscribe from real-time data for a symbol
   */
  unsubscribeFromSymbol(symbol: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.subscribedSymbols.delete(symbol);
      return;
    }

    const unsubscribeMessage = {
      action: 'unsubscribe',
      symbols: symbol
    };

    this.ws.send(JSON.stringify(unsubscribeMessage));
    this.subscribedSymbols.delete(symbol);
    console.log(`Unsubscribed from realtime data for ${symbol}`);
  }

  /**
   * Set callback for real-time data updates
   */
  onData(callback: RealtimeDataCallback): void {
    this.dataCallback = callback;
  }

  /**
   * Set callback for errors
   */
  onError(callback: ErrorCallback): void {
    this.errorCallback = callback;
  }

  /**
   * Set callback for connection status changes
   */
  onStatusChange(callback: StatusCallback): void {
    this.statusCallback = callback;
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: any): void {
    // EODHD message format for US trades
    if (data.s && data.p) { // symbol and price
      const realtimePrice: RealtimePrice = {
        symbol: data.s,
        price: parseFloat(data.p),
        size: data.v ? parseInt(data.v) : undefined,
        timestamp: data.t || Date.now(),
        marketStatus: data.ms,
        condition: data.c
      };

      this.dataCallback?.(realtimePrice);
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.errorCallback?.(new Error('Max reconnection attempts reached'));
        }
      });
    }, delay);
  }

  /**
   * Get current connection status
   */
  getStatus(): 'connecting' | 'connected' | 'disconnected' | 'error' {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'error';
    }
  }

  /**
   * Get list of subscribed symbols
   */
  getSubscribedSymbols(): string[] {
    return Array.from(this.subscribedSymbols);
  }
}

// Singleton instance
let realtimeService: EODHDRealtimeService | null = null;

export function getRealtimeService(): EODHDRealtimeService {
  if (!realtimeService) {
    realtimeService = new EODHDRealtimeService();
  }
  return realtimeService;
}