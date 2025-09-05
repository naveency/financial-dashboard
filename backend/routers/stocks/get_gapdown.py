from fastapi import APIRouter, HTTPException, Query
from datetime import datetime
from typing import List
import logging
from database import execute_query
from models import SymbolWithPriceResponse

router = APIRouter()

@router.get("/gapdown", response_model=List[SymbolWithPriceResponse])
async def get_gapdown(
    date: str = Query(..., description="Date to check for gap down (YYYY-MM-DD)"),
    limit: int = Query(None, description="Maximum number of records to return. If not set, return all.")
):
    try:
        try:
            datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        base_query = """
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
        WHERE current.date = ? AND current.is_gap_down = 1
        ORDER BY current.rs ASC NULLS LAST
        """
        params = [date]
        if limit is not None:
            base_query += "LIMIT ?"
            params.append(limit)
        results = execute_query(base_query, tuple(params))
        if not results:
            raise HTTPException(status_code=404, detail=f"No gap down data found for {date}")
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
        logging.error(f"Error fetching gap down data: {e}")
        raise HTTPException(status_code=500, detail="Error fetching gap down data")

