/**
 * Market hours utility functions
 * Handles US stock market trading hours including pre-market and after-hours
 */

export interface MarketHours {
  isOpen: boolean;
  isPreMarket: boolean;
  isAfterHours: boolean;
  isRegularHours: boolean;
  nextOpenTime?: Date;
  nextCloseTime?: Date;
  marketStatus: 'closed' | 'pre-market' | 'regular' | 'after-hours';
}

/**
 * Check if the current time is within market hours
 * US Market Hours (EST):
 * - Pre-market: 4:00 AM - 9:30 AM
 * - Regular hours: 9:30 AM - 4:00 PM
 * - After-hours: 4:00 PM - 8:00 PM
 */
export function getMarketHours(date?: Date): MarketHours {
  const now = date || new Date();
  
  // Convert to EST/EDT
  const estTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const dayOfWeek = estTime.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Check if it's a weekend
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  if (isWeekend) {
    return {
      isOpen: false,
      isPreMarket: false,
      isAfterHours: false,
      isRegularHours: false,
      marketStatus: 'closed'
    };
  }
  
  const hours = estTime.getHours();
  const minutes = estTime.getMinutes();
  const currentTime = hours * 60 + minutes; // Convert to minutes since midnight
  
  // Market hours in minutes since midnight (EST)
  const preMarketStart = 4 * 60;     // 4:00 AM
  const regularStart = 9 * 60 + 30;  // 9:30 AM
  const regularEnd = 16 * 60;        // 4:00 PM
  const afterHoursEnd = 20 * 60;     // 8:00 PM
  
  let marketStatus: MarketHours['marketStatus'] = 'closed';
  let isOpen = false;
  let isPreMarket = false;
  let isRegularHours = false;
  let isAfterHours = false;
  
  if (currentTime >= preMarketStart && currentTime < regularStart) {
    // Pre-market hours
    marketStatus = 'pre-market';
    isOpen = true;
    isPreMarket = true;
  } else if (currentTime >= regularStart && currentTime < regularEnd) {
    // Regular trading hours
    marketStatus = 'regular';
    isOpen = true;
    isRegularHours = true;
  } else if (currentTime >= regularEnd && currentTime < afterHoursEnd) {
    // After-hours trading
    marketStatus = 'after-hours';
    isOpen = true;
    isAfterHours = true;
  } else {
    // Market closed
    marketStatus = 'closed';
    isOpen = false;
  }
  
  return {
    isOpen,
    isPreMarket,
    isAfterHours,
    isRegularHours,
    marketStatus
  };
}

/**
 * Check if realtime data should be enabled
 * Only enable during market hours (including pre-market and after-hours)
 */
export function shouldEnableRealtimeData(date?: Date): boolean {
  const marketHours = getMarketHours(date);
  return marketHours.isOpen;
}

/**
 * Get market status display string
 */
export function getMarketStatusDisplay(date?: Date): string {
  const marketHours = getMarketHours(date);
  
  switch (marketHours.marketStatus) {
    case 'pre-market':
      return 'Pre-Market';
    case 'regular':
      return 'Market Open';
    case 'after-hours':
      return 'After Hours';
    case 'closed':
      return 'Market Closed';
    default:
      return 'Unknown';
  }
}

/**
 * Check if today is a US market holiday
 * This is a simplified version - in production you'd want to use a comprehensive holiday API
 */
export function isMarketHoliday(date?: Date): boolean {
  const checkDate = date || new Date();
  const month = checkDate.getMonth() + 1; // JavaScript months are 0-based
  const day = checkDate.getDate();
  
  // Common US market holidays (simplified)
  const holidays = [
    { month: 1, day: 1 },   // New Year's Day
    { month: 7, day: 4 },   // Independence Day
    { month: 12, day: 25 }, // Christmas Day
    // Note: This is simplified. Real implementation should include:
    // - Martin Luther King Jr. Day (3rd Monday in January)
    // - Presidents' Day (3rd Monday in February)
    // - Good Friday (varies)
    // - Memorial Day (last Monday in May)
    // - Labor Day (1st Monday in September)
    // - Thanksgiving (4th Thursday in November)
  ];
  
  return holidays.some(holiday => holiday.month === month && holiday.day === day);
}