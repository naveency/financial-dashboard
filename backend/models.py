from pydantic import BaseModel
from typing import Optional

class StockDataDaily(BaseModel):
    """Pydantic model for stock_data_daily table"""
    symbol: str
    name: str
    type: str
    interval: str
    date: str
    open: float
    high: float
    low: float
    close: float
    adjusted_close: float
    volume: int
    avg_volume: Optional[float] = None
    is_swing_high: Optional[int] = None
    swing_high: Optional[float] = None
    swing_high_cross_up: Optional[int] = None
    swing_high_cross_down: Optional[int] = None
    is_swing_low: Optional[int] = None
    swing_low: Optional[float] = None
    swing_low_cross_up: Optional[int] = None
    swing_low_cross_down: Optional[int] = None
    rs: Optional[float] = None
    is_rs_52_week_high: Optional[int] = None
    atr: Optional[float] = None
    is_gap_up: Optional[int] = None
    is_gap_down: Optional[int] = None
    is_doji_bar: Optional[int] = None
    is_bull_bar: Optional[int] = None
    is_bear_bar: Optional[int] = None
    ema_10: Optional[float] = None
    ema_21: Optional[float] = None
    ema_50: Optional[float] = None
    ema_200: Optional[float] = None
    rsi_14: Optional[float] = None
    is_high_63: Optional[int] = None
    is_high_252: Optional[int] = None
    is_low_63: Optional[int] = None
    is_low_252: Optional[int] = None
    buy_signal: Optional[int] = None
    sell_signal: Optional[int] = None
    signal: Optional[int] = None
    signal_change: Optional[int] = None

class StockDataCreate(BaseModel):
    """Model for creating new stock data entries"""
    symbol: str
    name: str
    type: str
    interval: str
    date: str
    open: float
    high: float
    low: float
    close: float
    adjusted_close: float
    volume: int

class RelativeStrengthResponse(BaseModel):
    """Model for 52-week relative strength API response"""
    symbol: str
    type: str
    rs: Optional[float] = None
    date: str

class StockDataFilter(BaseModel):
    """Model for filtering stock data"""
    symbol: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    limit: Optional[int] = 100

class SymbolTypeResponse(BaseModel):
    """Model for endpoints returning only symbol and type"""
    symbol: str
    type: str

class SymbolWithPriceResponse(BaseModel):
    """Model for endpoints returning symbol, type, and price data"""
    symbol: str
    type: str
    last_price: Optional[float] = None
    prev_close: Optional[float] = None
    price_change: Optional[float] = None
    percent_change: Optional[float] = None
