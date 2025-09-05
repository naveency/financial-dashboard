// Get API base URL from environment variables with fallback to localhost
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8080';

// Validate that we have a proper API URL
if (!API_BASE_URL) {
  throw new Error('NEXT_PUBLIC_API_BASE_URL environment variable is required');
}

export const API_ENDPOINTS = {
  maxdate: `${API_BASE_URL}/maxdate`,
  newHighs: `${API_BASE_URL}/new-highs`,
  newLows: `${API_BASE_URL}/new-lows`,
  gapup: `${API_BASE_URL}/gapup`,
  gapdown: `${API_BASE_URL}/gapdown`,
  swingHighCross: `${API_BASE_URL}/swing-high-cross`,
  swingLowCross: `${API_BASE_URL}/swing-low-cross`,
  newSignals: `${API_BASE_URL}/new-signals`,
  weekRelativeStrength: `${API_BASE_URL}/52-week-relative-strength`,
  priceData: `${API_BASE_URL}/price-data`
};

// Log API configuration in development
if (process.env.NODE_ENV === 'development') {
  console.log('API Base URL:', API_BASE_URL);
}