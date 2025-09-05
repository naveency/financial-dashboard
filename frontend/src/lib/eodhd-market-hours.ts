/**
 * EODHD API service for fetching real market hours and holidays
 */

export interface EODHDExchangeDetails {
  Name: string;
  Code: string;
  OperatingMIC: string;
  Country: string;
  Currency: string;
  CountryISO2: string;
  CountryISO3: string;
  TradingHours: {
    timezone: string;
    sessions: Array<{
      type: string;
      start: string;
      end: string;
    }>;
  };
  holidays?: Array<{
    date: string;
    name: string;
  }>;
}

export interface MarketSession {
  type: 'pre-market' | 'regular' | 'after-hours';
  start: string; // HH:MM format
  end: string;   // HH:MM format
}

class EODHDMarketHoursService {
  private apiToken: string;
  private exchangeCode: string;
  private cachedExchangeDetails: EODHDExchangeDetails | null = null;
  private cacheExpiry: number = 0;
  private readonly cacheDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private hasLoggedNoSessionsWarning = false; // Track if we've already logged the warning

  constructor() {
    this.apiToken = process.env.NEXT_PUBLIC_EODHD_API_TOKEN || '';
    this.exchangeCode = process.env.NEXT_PUBLIC_EODHD_EXCHANGE_CODE || 'US';
    
    if (!this.apiToken) {
      console.warn('EODHD API token not found. Market hours will use default values.');
    }
  }

  /**
   * Fetch exchange details from EODHD API
   */
  async fetchExchangeDetails(): Promise<EODHDExchangeDetails | null> {
    // Return cached data if still valid
    if (this.cachedExchangeDetails && Date.now() < this.cacheExpiry) {
      return this.cachedExchangeDetails;
    }

    if (!this.apiToken) {
      return null;
    }

    try {
      const url = `https://eodhd.com/api/exchange-details/${this.exchangeCode}?api_token=${this.apiToken}&fmt=json`;
      

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: EODHDExchangeDetails = await response.json();
      
      // Cache the results
      this.cachedExchangeDetails = data;
      this.cacheExpiry = Date.now() + this.cacheDuration;
      

      return data;
    } catch (error) {
      console.error('Failed to fetch exchange details from EODHD:', error);
      return null;
    }
  }

  /**
   * Convert UTC time to local market time
   */
  private convertUTCToMarketTime(utcTime: string, marketTimezone: string): string {
    // Parse UTC time (format: HH:MM or HH:MM:SS)
    const [hours, minutes] = utcTime.split(':').map(Number);
    
    // Create a UTC date for today with the given time
    const utcDate = new Date();
    utcDate.setUTCHours(hours, minutes, 0, 0);
    
    // Convert to market timezone
    const marketTime = new Date(utcDate.toLocaleString("en-US", { timeZone: marketTimezone }));
    
    // Format as HH:MM
    const marketHours = marketTime.getHours().toString().padStart(2, '0');
    const marketMinutes = marketTime.getMinutes().toString().padStart(2, '0');
    
    return `${marketHours}:${marketMinutes}`;
  }

  /**
   * Get market sessions from EODHD data with UTC conversion
   */
  async getMarketSessions(): Promise<MarketSession[]> {
    const exchangeDetails = await this.fetchExchangeDetails();
    
    if (!exchangeDetails?.TradingHours?.sessions || exchangeDetails.TradingHours.sessions.length === 0) {
      // Only log the warning once per session
      if (!this.hasLoggedNoSessionsWarning) {
        console.warn('EODHD API returned no trading sessions. Using conservative fallback (regular hours only).');
        this.hasLoggedNoSessionsWarning = true;
      }
      // Return conservative fallback - only regular hours to avoid false positives
      return [
        { type: 'regular', start: '09:30', end: '16:00' }
      ];
    }

    const marketTimezone = exchangeDetails.TradingHours.timezone || 'America/New_York';
    const sessions: MarketSession[] = [];
    
    for (const session of exchangeDetails.TradingHours.sessions) {
      let type: MarketSession['type'];
      
      // Map EODHD session types to our types
      switch (session.type.toLowerCase()) {
        case 'pre-market':
        case 'premarket':
        case 'pre_market':
          type = 'pre-market';
          break;
        case 'regular':
        case 'main':
        case 'normal':
        case 'core':
          type = 'regular';
          break;
        case 'after-hours':
        case 'afterhours':
        case 'after_hours':
        case 'extended':
        case 'post':
          type = 'after-hours';
          break;
        default:
          type = 'regular';
          break;
      }

      // Convert UTC times to local market time
      const localStart = this.convertUTCToMarketTime(session.start, marketTimezone);
      const localEnd = this.convertUTCToMarketTime(session.end, marketTimezone);

      sessions.push({
        type,
        start: localStart,
        end: localEnd
      });
    }

    return sessions;
  }

  /**
   * Check if today is a market holiday
   */
  async isMarketHoliday(date?: Date): Promise<boolean> {
    const checkDate = date || new Date();
    const exchangeDetails = await this.fetchExchangeDetails();
    
    if (!exchangeDetails?.holidays) {
      // Fallback to basic holiday check if API fails
      return this.isBasicHoliday(checkDate);
    }

    const dateString = checkDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    return exchangeDetails.holidays.some(holiday => holiday.date === dateString);
  }

  /**
   * Basic holiday check as fallback
   */
  private isBasicHoliday(date: Date): boolean {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    const holidays = [
      { month: 1, day: 1 },   // New Year's Day
      { month: 7, day: 4 },   // Independence Day
      { month: 12, day: 25 }, // Christmas Day
    ];
    
    return holidays.some(holiday => holiday.month === month && holiday.day === day);
  }

  /**
   * Get market timezone from EODHD data
   */
  async getMarketTimezone(): Promise<string> {
    const exchangeDetails = await this.fetchExchangeDetails();
    return exchangeDetails?.TradingHours?.timezone || 'America/New_York';
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cachedExchangeDetails = null;
    this.cacheExpiry = 0;
    this.hasLoggedNoSessionsWarning = false; // Reset warning flag when clearing cache
  }
}

// Singleton instance
let marketHoursService: EODHDMarketHoursService | null = null;

export function getMarketHoursService(): EODHDMarketHoursService {
  if (!marketHoursService) {
    marketHoursService = new EODHDMarketHoursService();
  }
  return marketHoursService;
}