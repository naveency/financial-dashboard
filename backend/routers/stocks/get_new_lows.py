from fastapi import APIRouter, HTTPException, Query
from datetime import datetime
from typing import List
import logging
from database import execute_query
from models import SymbolTypeResponse

router = APIRouter()

@router.get("/new-lows", response_model=List[SymbolTypeResponse])
async def get_new_lows(
    date: str = Query(..., description="Date to check for new lows (YYYY-MM-DD)"),
    period: int = Query(..., description="Period for new low (e.g., 63 or 252)"),
    limit: int = Query(None, description="Maximum number of records to return. If not set, return all.")
):
    try:
        try:
            datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        if period not in (63, 252):
            raise HTTPException(status_code=400, detail="Period must be 63 or 252")
        col = f"is_low_{period}"
        base_query = f"""
        SELECT symbol, type
        FROM stock_data_daily
        WHERE date = ? AND {col} = 1
        ORDER BY rs ASC NULLS LAST
        """
        params = [date]
        if limit is not None:
            base_query += "LIMIT ?"
            params.append(limit)
        results = execute_query(base_query, tuple(params))
        if not results:
            raise HTTPException(status_code=404, detail=f"No new lows found for {date} and period {period}")
        return [SymbolTypeResponse(**row) for row in results]
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching new lows: {e}")
        raise HTTPException(status_code=500, detail="Error fetching new lows")

