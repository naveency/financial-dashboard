from fastapi import APIRouter, HTTPException, Query
from datetime import datetime
from typing import List
import logging
from database import execute_query
from models import SymbolWithPriceResponse

router = APIRouter()

@router.get("/swing-low-cross", response_model=List[SymbolWithPriceResponse])
async def get_swing_low_cross(
    date: str = Query(..., description="Date to check for swing low cross (YYYY-MM-DD)"),
    direction: str = Query(..., description="Direction: 'up' or 'down'"),
    limit: int = Query(None, description="Maximum number of records to return. If not set, return all.")
):
    try:
        try:
            datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        if direction not in ("up", "down"):
            raise HTTPException(status_code=400, detail="Direction must be 'up' or 'down'")
        col = "swing_low_cross_up" if direction == "up" else "swing_low_cross_down"
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
        WHERE current.date = ? AND current.{col} = 1
        ORDER BY current.rs DESC NULLS LAST
        """
        params = [date]
        if limit is not None:
            base_query += "LIMIT ?"
            params.append(limit)
        results = execute_query(base_query, tuple(params))
        if not results:
            raise HTTPException(status_code=404, detail=f"No swing low cross {direction} found for {date}")
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
        logging.error(f"Error fetching swing low cross: {e}")
        raise HTTPException(status_code=500, detail="Error fetching swing low cross")

