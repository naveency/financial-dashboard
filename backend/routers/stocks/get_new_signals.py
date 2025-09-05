from fastapi import APIRouter, HTTPException, Query
from datetime import datetime
from typing import List
import logging
from database import execute_query
from models import SymbolWithPriceResponse

router = APIRouter()

@router.get("/new-signals", response_model=List[SymbolWithPriceResponse])
async def get_new_signals(
    date: str = Query(..., description="Date to check for new signals (YYYY-MM-DD)"),
    signal: str = Query(..., description="Signal type: 'buy' or 'sell'"),
    limit: int = Query(None, description="Maximum number of records to return. If not set, return all.")
):
    try:
        try:
            datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        if signal not in ("buy", "sell"):
            raise HTTPException(status_code=400, detail="Signal must be 'buy' or 'sell'")
        signal_value = 1 if signal == "buy" else -1
        base_query = f"""
        SELECT 
            current.symbol, 
            current.type, 
            current.close as last_price,
            prev.close as prev_close,
            (current.close - prev.close) as price_change,
            CASE 
                WHEN prev.close > 0 THEN ((current.close - prev.close) / prev.close) * 100.0
                ELSE NULL 
            END as percent_change
        FROM stock_data_daily current
        LEFT JOIN stock_data_daily prev ON current.symbol = prev.symbol 
            AND prev.date = (
                SELECT MAX(date) FROM stock_data_daily 
                WHERE symbol = current.symbol AND date < current.date
            )
        WHERE current.date = ? AND current.signal_change = 1 AND current.signal = ?
        ORDER BY current.rs DESC NULLS LAST
        """
        params = [date, signal_value]
        if limit is not None:
            base_query += "LIMIT ?"
            params.append(limit)
        results = execute_query(base_query, tuple(params))
        if not results:
            raise HTTPException(status_code=404, detail=f"No new {signal}s found for {date}")
        return [
            SymbolWithPriceResponse(
                symbol=row['symbol'],
                type=row['type'],
                last_price=row['last_price'],
                prev_close=row['prev_close'],
                price_change=row['price_change'],
                percent_change=row['percent_change']
            ) for row in results
        ]
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching new signals: {e}")
        raise HTTPException(status_code=500, detail="Error fetching new signals")

