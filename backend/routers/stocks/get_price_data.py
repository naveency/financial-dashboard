from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timedelta
from typing import List, Optional
import logging
from database import execute_query
from pydantic import BaseModel

router = APIRouter()

class CandlestickData(BaseModel):
    time: str  # YYYY-MM-DD format for TradingView
    open: float
    high: float
    low: float
    close: float
    volume: int
    ema_21: Optional[float] = None
    ema_200: Optional[float] = None

@router.get("/price-data/{symbol}", response_model=List[CandlestickData])
async def get_price_data(
    symbol: str,
    days: int = Query(default=90, description="Number of days of data to return", ge=1, le=365)
):
    """
    Get OHLCV price data for a specific symbol
    Returns data in format compatible with TradingView Lightweight Charts
    """
    try:
        # Calculate the start date based on days parameter
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=days)
        
        query = """
        SELECT date, open, high, low, close, volume, ema_21, ema_200
        FROM stock_data_daily
        WHERE symbol = ? AND date >= ? AND date <= ?
        ORDER BY date ASC
        """
        
        params = (symbol.upper(), start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d'))
        results = execute_query(query, params)
        
        if not results:
            raise HTTPException(
                status_code=404, 
                detail=f"No price data found for symbol {symbol}"
            )
        
        # Convert to CandlestickData format
        candlestick_data = []
        for row in results:
            candlestick_data.append(CandlestickData(
                time=row['date'],
                open=float(row['open']),
                high=float(row['high']),
                low=float(row['low']),
                close=float(row['close']),
                volume=int(row['volume']),
                ema_21=float(row['ema_21']) if row['ema_21'] is not None else None,
                ema_200=float(row['ema_200']) if row['ema_200'] is not None else None
            ))
        
        return candlestick_data
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching price data for {symbol}: {e}")
        raise HTTPException(status_code=500, detail="Error fetching price data")