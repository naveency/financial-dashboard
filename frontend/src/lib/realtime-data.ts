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
    
    // Debug logging and validation
    if (process.env.NODE_ENV === 'development') {
      console.log('EODHD Service Debug:', {
        hasApiToken: !!this.apiToken,
        apiTokenLength: this.apiToken.length,
        wsUrl: this.wsUrl,
        tokenPreview: this.apiToken ? this.apiToken.substring(0, 8) + '...' : 'none',
        tokenFormat: this.validateTokenFormat(this.apiToken)
      });
    }
    
    if (!this.apiToken || !this.wsUrl) {
      throw new Error('EODHD API token and WebSocket URL are required');
    }
    
    // Validate token format
    if (!this.validateTokenFormat(this.apiToken)) {
      console.warn('EODHD API token may have invalid format. Expected format: xxxxxxxx.xxxxxxxx');
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
        console.log('Connecting to EODHD WebSocket:', wsUrlWithAuth.replace(this.apiToken, 'TOKEN_HIDDEN'));
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
            console.log('EODHD WebSocket message received:', data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
            this.errorCallback?.(error as Error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('EODHD WebSocket disconnected:', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          });
          this.statusCallback?.('disconnected');
          
          // Common WebSocket close codes
          const closeReasons = {
            1000: 'Normal closure',
            1001: 'Going away',
            1002: 'Protocol error',
            1003: 'Unsupported data',
            1006: 'Abnormal closure',
            1011: 'Server error',
            1015: 'TLS handshake failure'
          };
          
          console.log('Close reason:', closeReasons[event.code as keyof typeof closeReasons] || 'Unknown');
          
          // Attempt to reconnect if not manually closed
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('EODHD WebSocket error details:', {
            error,
            readyState: this.ws?.readyState,
            url: wsUrlWithAuth.replace(this.apiToken, 'TOKEN_HIDDEN'),
            timestamp: new Date().toISOString(),
            tokenValid: this.validateTokenFormat(this.apiToken),
            reconnectAttempt: this.reconnectAttempts
          });
          
          // Check if it's an authentication error
          if (this.ws?.readyState === WebSocket.CONNECTING) {
            if (!this.validateTokenFormat(this.apiToken)) {
              console.error('Connection failed - invalid API token format. Expected: xxxxxxxx.xxxxxxxx');
            } else {
              console.error('Connection failed - possible authentication or network issue');
            }
          }
          
          this.statusCallback?.('error');
          const errorMessage = `WebSocket connection error${this.reconnectAttempts > 0 ? ` (attempt ${this.reconnectAttempts + 1})` : ''}`;
          this.errorCallback?.(new Error(errorMessage));
          reject(new Error(errorMessage));
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

      console.log('Processing realtime price update:', realtimePrice);
      this.dataCallback?.(realtimePrice);
    } else {
      console.log('Received non-price message:', data);
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

  /**
   * Validate EODHD API token format
   * Expected format: xxxxxxxx.xxxxxxxx (8 chars, dot, 8 chars)
   */
  private validateTokenFormat(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // EODHD tokens typically follow the pattern: 8chars.8chars
    const tokenPattern = /^[a-zA-Z0-9]{8}\.[a-zA-Z0-9]{8}$/;
    return tokenPattern.test(token);
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