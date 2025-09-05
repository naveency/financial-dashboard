/**
 * Market hours utility functions
 * Uses EODHD API for accurate market hours and holidays, with fallback to hardcoded values
 */

import { getMarketHoursService, MarketSession } from './eodhd-market-hours';

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
 * Parse time string (HH:MM) to minutes since midnight
 */
function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Get market hours using EODHD API data with fallback to hardcoded values
 */
export async function getMarketHours(date?: Date): Promise<MarketHours> {
  const now = date || new Date();
  const marketHoursService = getMarketHoursService();
  
  // Get market timezone from EODHD (defaults to America/New_York)
  const timezone = await marketHoursService.getMarketTimezone();
  const localTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  const dayOfWeek = localTime.getDay(); // 0 = Sunday, 6 = Saturday
  
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
  
  // Check if it's a market holiday
  const isHoliday = await marketHoursService.isMarketHoliday(now);
  if (isHoliday) {
    return {
      isOpen: false,
      isPreMarket: false,
      isAfterHours: false,
      isRegularHours: false,
      marketStatus: 'closed'
    };
  }
  
  const hours = localTime.getHours();
  const minutes = localTime.getMinutes();
  const currentTime = hours * 60 + minutes; // Convert to minutes since midnight
  
  // Get market sessions from EODHD API
  const sessions = await marketHoursService.getMarketSessions();
  
  let marketStatus: MarketHours['marketStatus'] = 'closed';
  let isOpen = false;
  let isPreMarket = false;
  let isRegularHours = false;
  let isAfterHours = false;
  
  // Check which session we're currently in
  for (const session of sessions) {
    const sessionStart = parseTimeToMinutes(session.start);
    const sessionEnd = parseTimeToMinutes(session.end);
    
    if (currentTime >= sessionStart && currentTime < sessionEnd) {
      marketStatus = session.type;
      isOpen = true;
      
      switch (session.type) {
        case 'pre-market':
          isPreMarket = true;
          break;
        case 'regular':
          isRegularHours = true;
          break;
        case 'after-hours':
          isAfterHours = true;
          break;
      }
      break;
    }
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
 * Synchronous version with cached data for immediate use
 */
export function getMarketHoursSync(date?: Date): MarketHours {
  const now = date || new Date();
  
  // Convert to EST/EDT as fallback
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
  
  // Default US market hours in minutes since midnight (EST)
  // NOTE: When EODHD API fails, we'll be more conservative and only consider regular hours as "open"
  const regularStart = 9 * 60 + 30;  // 9:30 AM
  const regularEnd = 16 * 60;        // 4:00 PM
  
  let marketStatus: MarketHours['marketStatus'] = 'closed';
  let isOpen = false;
  let isPreMarket = false;
  let isRegularHours = false;
  let isAfterHours = false;
  
  if (currentTime >= regularStart && currentTime < regularEnd) {
    // Regular trading hours only (conservative fallback)
    marketStatus = 'regular';
    isOpen = true;
    isRegularHours = true;
  } else {
    // Market closed (conservative approach when API data unavailable)
    marketStatus = 'closed';
    isOpen = false;
    
    // Still categorize the time periods for display purposes
    const preMarketStart = 4 * 60;     // 4:00 AM
    const afterHoursEnd = 20 * 60;     // 8:00 PM
    
    if (currentTime >= preMarketStart && currentTime < regularStart) {
      marketStatus = 'pre-market';
      isPreMarket = true;
    } else if (currentTime >= regularEnd && currentTime < afterHoursEnd) {
      marketStatus = 'after-hours';
      isAfterHours = true;
    }
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
 * Check if realtime data should be enabled (async version with EODHD API)
 * Only enable during market hours (including pre-market and after-hours)
 */
export async function shouldEnableRealtimeData(date?: Date): Promise<boolean> {
  const marketHours = await getMarketHours(date);
  
  
  return marketHours.isOpen;
}

/**
 * Synchronous version for immediate use (uses cached data or fallback)
 */
export function shouldEnableRealtimeDataSync(date?: Date): boolean {
  const marketHours = getMarketHoursSync(date);
  return marketHours.isOpen;
}

/**
 * Get market status display string (async version with EODHD API)
 */
export async function getMarketStatusDisplay(date?: Date): Promise<string> {
  const marketHours = await getMarketHours(date);
  
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
 * Synchronous version for immediate use
 */
export function getMarketStatusDisplaySync(date?: Date): string {
  const marketHours = getMarketHoursSync(date);
  
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
 * Check if today is a US market holiday using EODHD API
 */
export async function isMarketHoliday(date?: Date): Promise<boolean> {
  const marketHoursService = getMarketHoursService();
  return await marketHoursService.isMarketHoliday(date);
}